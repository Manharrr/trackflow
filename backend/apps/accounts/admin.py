from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "id",
        "email",
        "phone",
        "is_verified",
        "is_google_account",
        "is_mfa_enabled",
        "is_staff",
    )

    list_filter = (
        "is_verified",
        "is_google_account",
        "is_mfa_enabled",
        "is_staff",
        "is_superuser",
    )

    search_fields = (
        "email",
        "phone",
        "username",
    )

    ordering = (
        "id",
    )