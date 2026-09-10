from django.db import models

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):

    email = models.EmailField(unique=True)
    phone = models.CharField(
        max_length=15,
        unique=True,
    )

    is_verified = models.BooleanField(default=False)

    is_mfa_enabled = models.BooleanField(
        default=False
    )

    mfa_secret = models.CharField(
        max_length=64,
        blank=True,
        null=True,
    )

    google_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
    )

    is_google_account = models.BooleanField(
        default=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "username"
    ]

    def __str__(self):
        return self.email or self.phone

