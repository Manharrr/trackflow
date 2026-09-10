import uuid

from django.db import models
from django.conf import settings


class AccountActivation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activation",
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    is_used = models.BooleanField(
        default=False,
    )

    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.user.email