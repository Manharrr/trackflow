from django.contrib import admin
from .models import Client, Domain, UserTenant


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "schema_name",
        "email",
        "phone",
        "status",
        "verified",
        "created_at",
    )
    list_filter = ("status", "verified")
    search_fields = ("name", "schema_name", "email", "phone")
    ordering = ("-created_at",)


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("id", "domain", "tenant", "is_primary")
    list_filter = ("is_primary",)
    search_fields = ("domain",)


@admin.register(UserTenant)
class UserTenantAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tenant", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__email", "tenant__name")
    ordering = ("-created_at",)
