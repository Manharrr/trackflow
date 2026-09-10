from django.contrib import admin

# from .models.employee import Employee, AccountActivation
from apps.employees.models import Employee, AccountActivation

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tenant",
        "user",
        "role",
        "full_name",
        "email",
        "phone",
        "is_active",
        "is_blocked",
    )
    list_filter = ("role", "is_active", "is_blocked")
    search_fields = ("full_name", "email", "phone")
    ordering = ("-created_at",)


@admin.register(AccountActivation)
class AccountActivationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "token",
        "is_used",
        "expires_at",
        "created_at",
    )
    list_filter = ("is_used",)
    search_fields = ("user__email", "token")
    ordering = ("-created_at",)