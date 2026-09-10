import uuid
from django.db import models
from apps.orders.models.order import Order
from apps.employees.models import Employee


class DeliveryAttempt(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    attempted_at = models.DateTimeField(
        auto_now_add=True,
    )
    attempt_number = models.IntegerField()
    status = models.CharField(
        max_length=30,
        default="Failed",
    )
    reason = models.TextField(
        blank=True,
        default="",
    )
    remarks = models.TextField(
        blank=True,
        default="",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_attempts",
    )

    class Meta:
        ordering = ["-attempted_at"]
