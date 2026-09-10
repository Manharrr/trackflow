import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.tenants.models import Client


class Conversation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="conversations",
        db_constraint=False,
    )
    participant_one = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chats_as_p1",
        db_constraint=False,
    )
    participant_two = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chats_as_p2",
        db_constraint=False,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_chats",
        db_constraint=False,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["tenant"], name="idx_chat_tenant"),
            models.Index(fields=["participant_one"], name="idx_chat_p1"),
            models.Index(fields=["participant_two"], name="idx_chat_p2"),
            models.Index(fields=["created_at"], name="idx_chat_created_at"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["participant_one", "participant_two", "tenant"],
                name="unique_conversation_participants",
            )
        ]

    def clean(self):
        if self.participant_one == self.participant_two:
            raise ValidationError("Participants must be distinct users.")

    def save(self, *args, **kwargs):
        self.full_clean()
        # Sort participant IDs lexicographically for idempotency/uniqueness
        p1_id = str(self.participant_one.id)
        p2_id = str(self.participant_two.id)
        if p1_id > p2_id:
            self.participant_one, self.participant_two = self.participant_two, self.participant_one
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Conversation ({self.id}) - {self.participant_one.email} & {self.participant_two.email}"
