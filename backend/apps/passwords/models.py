from datetime import timedelta
import uuid

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.hashers import check_password


class PasswordResetToken(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    otp_hash = models.CharField(
        max_length=255,
    )

    expires_at = models.DateTimeField()

    is_used = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:

        ordering = [
            "-created_at"
        ]

    def __str__(self):

        return (
            f"{self.user.email}"
        )

    @property
    def is_expired(self):

        return (
            timezone.now()
            >
            self.expires_at
        )

    @classmethod
    def expiry_time(cls):

        return (
            timezone.now()
            +
            timedelta(
                minutes=10
            )
        )

    def verify(
        self,
        otp,
    ):

        return check_password(
            otp,
            self.otp_hash,
        )