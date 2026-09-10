import uuid
from django.db import models
from django.conf import settings
from .conversation import Conversation


class MessageType(models.TextChoices):
    TEXT = "text", "Text"
    IMAGE = "image", "Image"
    FILE = "file", "File"
    VIDEO = "video", "Video"
    AUDIO = "audio", "Audio"
    LOCATION = "location", "Location"


class ActiveMessageManager(models.Manager):
    """
    Manager filtering out soft-deleted messages by default.
    """
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class Message(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
        db_constraint=False,
    )
    message = models.TextField(
        blank=True,
        default="",
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    is_read = models.BooleanField(
        default=False,
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    edited = models.BooleanField(
        default=False,
    )
    is_deleted = models.BooleanField(
        default=False,
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # Managers
    objects = models.Manager()
    active = ActiveMessageManager()

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation"], name="idx_msg_conversation"),
            models.Index(fields=["sender"], name="idx_msg_sender"),
            models.Index(fields=["created_at"], name="idx_msg_created_at"),
            models.Index(fields=["is_deleted"], name="idx_msg_is_deleted"),
        ]

    def __str__(self):
        return f"Message {self.id} from {self.sender.email} in Conversation {self.conversation.id}"
