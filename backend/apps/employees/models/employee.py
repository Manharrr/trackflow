import uuid

from django.db import models
from django.conf import settings

from apps.tenants.models import Client

class Role(models.TextChoices):

    COMPANY_ADMIN = (
        "company_admin",
        "Company Admin",
    )

    OPERATIONS_MANAGER = (
        "operations_manager",
        "Operations Manager",
    )

    EMPLOYEE = (
        "employee",
        "Employee",
    )


class Employee(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employees",
    )

    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="employees",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )

    full_name = models.CharField(
        max_length=150,
    )

    email = models.EmailField()

    phone = models.CharField(
        max_length=15,
    )

    profile_image = models.ImageField(
        upload_to="employees/",
        blank=True,
        null=True,
    )

    department = models.CharField(
        max_length=100,
        blank=True,
    )

    designation = models.CharField(
        max_length=100,
        blank=True,
    )

    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_members",
    )

    address = models.TextField(
        blank=True,
    )

    emergency_contact = models.CharField(
        max_length=15,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_blocked = models.BooleanField(
        default=False,
    )

    first_login = models.BooleanField(
        default=True,
    )

    password_changed = models.BooleanField(
        default=False,
    )

    joined_at = models.DateField(
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_employees",
    )

    employee_code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "user",
                ],
                name="unique_employee_per_tenant",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.employee_code:
            count = Employee.objects.count()
            code = f"TF-EMP-{count + 1:04d}"
            while Employee.objects.filter(employee_code=code).exists():
                count += 1
                code = f"TF-EMP-{count + 1:04d}"
            self.employee_code = code
        super().save(*args, **kwargs)

    def __str__(self):

        return (
            f"{self.full_name} ({self.role})"
        )

