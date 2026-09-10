from rest_framework import serializers
from apps.chat.models.conversation import Conversation
from apps.chat.models.message import Message, MessageType
from apps.chat.serializers.conversation_serializer import ChatUserSerializer


class MessageSerializer(serializers.ModelSerializer):
    conversation = serializers.CharField(source="conversation.id", read_only=True)
    sender = ChatUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "message",
            "message_type",
            "is_read",
            "read_at",
            "edited",
            "created_at",
            "updated_at",
        ]

class MessageCreateSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=True)
    message = serializers.CharField(required=True, max_length=5000)
    message_type = serializers.ChoiceField(choices=MessageType.choices, default=MessageType.TEXT)

    def validate_conversation_id(self, value):
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context missing.")
        
        tenant = request.tenant
        try:
            conversation = Conversation.objects.get(id=value, tenant=tenant)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found in this tenant.")

        # Verify requesting user is a participant
        if request.user != conversation.participant_one and request.user != conversation.participant_two:
            raise serializers.ValidationError("You are not an authorized participant in this conversation.")

        return conversation

    def validate(self, attrs):
        conversation = attrs["conversation_id"]
        request = self.context.get("request")
        sender = request.user
        message = attrs["message"]

        if not message.strip():
            raise serializers.ValidationError({"message": "Message body cannot be empty."})

        return attrs


class MessageReadSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=True)

    def validate_conversation_id(self, value):
        request = self.context.get("request")
        if not request:
            raise serializers.ValidationError("Request context missing.")

        tenant = request.tenant
        try:
            conversation = Conversation.objects.get(id=value, tenant=tenant)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found in this tenant.")

        # Verify requesting user is a participant
        if request.user != conversation.participant_one and request.user != conversation.participant_two:
            raise serializers.ValidationError("You are not an authorized participant in this conversation.")

        return conversation
