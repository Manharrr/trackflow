from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from apps.chat.models.conversation import Conversation
from apps.chat.permissions.chat_permissions import IsConversationParticipant
from apps.chat.serializers.message_serializer import (
    MessageSerializer,
    MessageCreateSerializer,
    MessageReadSerializer,
)
from apps.chat.services.message_service import MessageService


class MessageListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, conversation_id):
        """
        Retrieves paginated messages in a conversation.
        """
        tenant = request.tenant
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check object level permissions explicitly
        self.check_object_permissions(request, conversation)

        messages = MessageService.get_messages(conversation)

        # Implement DRF LimitOffsetPagination
        paginator = LimitOffsetPagination()
        paginator.default_limit = 50
        paginator.max_limit = 100
        page = paginator.paginate_queryset(messages, request, view=self)

        serializer = MessageSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class MessageCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Sends a new message inside a conversation.
        """
        serializer = MessageCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        conversation = serializer.validated_data["conversation_id"]
        message_text = serializer.validated_data["message"]
        message_type = serializer.validated_data["message_type"]

        message = MessageService.create_message(
            conversation=conversation,
            sender=request.user,
            message=message_text,
            message_type=message_type,
        )

        response_serializer = MessageSerializer(message, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class MarkMessageReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        """
        Marks all incoming messages in a conversation as read.
        """
        serializer = MessageReadSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        conversation = serializer.validated_data["conversation_id"]
        
        # Call service to mark read status
        updated_count = MessageService.mark_as_read(conversation, request.user)

        return Response(
            {
                "message": "Messages marked as read successfully.",
                "updated_count": updated_count
            },
            status=status.HTTP_200_OK
        )
