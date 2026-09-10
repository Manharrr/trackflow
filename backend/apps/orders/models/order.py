import uuid
from django.db import models
from django.conf import settings
from apps.tenants.models import Client
from apps.employees.models import Employee


class OrderStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    ASSIGNED = "Assigned", "Assigned"
    PICKED_UP = "Picked Up", "Picked Up"
    IN_TRANSIT = "In Transit", "In Transit"
    OUT_FOR_DELIVERY = "Out For Delivery", "Out For Delivery"
    DELIVERED = "Delivered", "Delivered"
    CANCELLED = "Cancelled", "Cancelled"
    FAILED = "Failed", "Failed"
    RTO = "RTO", "RTO"


class OrderPriority(models.TextChoices):
    LOW = "Low", "Low"
    MEDIUM = "Medium", "Medium"
    HIGH = "High", "High"
    URGENT = "Urgent", "Urgent"


class Order(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    tracking_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )
    customer_name = models.CharField(
        max_length=200,
    )
    customer_phone = models.CharField(
        max_length=15,
    )
    customer_email = models.EmailField(
        blank=True,
        default="",
    )
    pickup_address = models.TextField()
    delivery_address = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=OrderPriority.choices,
        default=OrderPriority.MEDIUM,
    )
    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )
    assigned_employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_orders",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_orders_by",
    )
    company = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    expected_delivery_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    actual_delivery_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    internal_notes = models.TextField(
        blank=True,
        default="",
    )
    attempt_count = models.IntegerField(
        default=0,
    )
    is_deleted = models.BooleanField(
        default=False,
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"], name="idx_order_status_priority"),
            models.Index(fields=["expected_delivery_date"], name="idx_order_exp_delivery"),
            models.Index(fields=["created_at"], name="idx_order_created_at"),
            models.Index(fields=["is_deleted"], name="idx_order_is_deleted"),
        ]

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            count = Order.objects.count()
            code = f"TRK{count + 1:06d}"
            while Order.objects.filter(tracking_id=code).exists():
                count += 1
                code = f"TRK{count + 1:06d}"
            self.tracking_id = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tracking_id} - {self.customer_name}"
