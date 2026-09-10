from django.contrib import admin
from .models import PasswordResetToken


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "token",
        "otp_hash",
        "expires_at",
        "is_used",
        "created_at",
    )
    list_filter = ("is_used",)
    search_fields = ("user__email", "user__phone", "token")
    ordering = ("-created_at",)
