import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from apps.chat.models.conversation import Conversation
from apps.chat.services.message_service import MessageService
from apps.chat.serializers.message_serializer import MessageSerializer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Production-grade WebSocket Consumer processing connections, authentications,
    database writing, and live group broadcasts.
    """

    async def connect(self):
        self.user = self.scope.get("user")
        self.tenant = self.scope.get("tenant")

        if not self.user or self.user.is_anonymous or not self.tenant:
            await self.close(code=4003)
            return

        # Fetch conversation UUID from URL routing parameter
        self.conversation_id = self.scope["url_route"]["kwargs"].get("conversation_id")
        if not self.conversation_id:
            await self.close(code=4000)
            return

        # Assert membership in the conversation
        self.conversation = await self.get_conversation(self.conversation_id)
        if not self.conversation:
            await self.close(code=4004)
            return
        
            #    Create group name
        self.group_name = f"chat_{self.conversation_id}"

        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        message_text = content.get("message")
        message_type = content.get("message_type", "text")

        # Create the message inside database
        try:
            message_obj = await self.save_message(message_text, message_type)
        except Exception as e:
            await self.send_json({"error": str(e)})
            return

        # Serialize message output
        payload = await self.serialize_message(message_obj)

        # Broadcast update to group channel layers
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message_data": payload
            }
        )

    async def chat_message(self, event):
        # Transmit group message to WebSocket client
        await self.send_json(event["message_data"])

    @database_sync_to_async
    def get_conversation(self, conversation_id):
        try:
            from django.db import connection
            connection.set_tenant(self.tenant)
            conv = Conversation.objects.get(id=conversation_id, tenant=self.tenant)
            # Ensure requesting user is a registered participant
            if self.user != conv.participant_one and self.user != conv.participant_two:
                return None
            return conv
        except Exception:
            return None

    @database_sync_to_async
    def save_message(self, message_text, message_type):
        from django.db import connection
        connection.set_tenant(self.tenant)
        return MessageService.create_message(
            conversation=self.conversation,
            sender=self.user,
            message=message_text,
            message_type=message_type,
        )

    @database_sync_to_async
    def serialize_message(self, message_obj):
        class MockRequest:
            def __init__(self, user, tenant):
                self.user = user
                self.tenant = tenant

        serializer = MessageSerializer(
            message_obj,
            context={"request": MockRequest(self.user, self.tenant)}
        )
        return serializer.data
