import uuid
from django.db import models
from django.conf import settings
from apps.orders.models.order import Order, OrderStatus
from apps.employees.models import Employee


class OrderStatusHistory(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    previous_status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        blank=True,
        default="",
    )
    current_status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
    )
    remarks = models.TextField(
        blank=True,
        default="",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]


class AssignmentHistory(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="assignment_history",
    )
    old_employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="old_assignments",
    )
    new_employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="new_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_driver_records",
    )
    reason = models.TextField(
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
