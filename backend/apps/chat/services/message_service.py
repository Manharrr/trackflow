from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from apps.chat.models.conversation import Conversation
from apps.chat.models.message import Message, MessageType


class MessageService:

    @staticmethod
    def validate_sender(conversation: Conversation, sender):
        """
        Verify that the sender is an authorized participant in the conversation.
        """
        if sender != conversation.participant_one and sender != conversation.participant_two:
            raise ValidationError("Sender is not a participant in this conversation.")

    @staticmethod
    @transaction.atomic
    def create_message(
        *,
        conversation: Conversation,
        sender,
        message: str,
        message_type: str = MessageType.TEXT
    ) -> Message:
        """
        Validates constraints and creates a new Message record.
        """
        # 1. Sender validation
        MessageService.validate_sender(conversation, sender)

        # 2. Empty check
        cleaned_text = message.strip()
        if not cleaned_text:
            raise ValidationError("Message body cannot be empty.")

        # 3. Maximum length validation
        if len(cleaned_text) > 5000:
            raise ValidationError("Message cannot exceed 5000 characters.")

        # 4. Message type validation
        if message_type not in MessageType.values:
            raise ValidationError(f"Invalid message type. Choose from: {MessageType.values}")

        # Create record
        return Message.objects.create(
            conversation=conversation,
            sender=sender,
            message=cleaned_text,
            message_type=message_type,
        )

    @staticmethod
    @transaction.atomic
    def mark_as_read(conversation: Conversation, user) -> int:
        """
        Marks all incoming unread messages in the conversation as read.
        """
        unread_messages = Message.active.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=user)

        updated_count = unread_messages.update(
            is_read=True,
            read_at=timezone.now()
        )
        return updated_count

    @staticmethod
    def get_messages(conversation: Conversation):
        """
        Returns active messages in chronological order.
        """
        return Message.active.filter(
            conversation=conversation
        ).select_related("sender")

    @staticmethod
    def get_last_message(conversation: Conversation) -> Message:
        """
        Returns the last active message in the conversation.
        """
        return Message.active.filter(
            conversation=conversation
        ).select_related("sender").last()

    @staticmethod
    def get_unread_count(conversation: Conversation, user) -> int:
        """
        Returns the count of unread messages for the given user in this conversation.
        """
        return Message.active.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=user).count()
