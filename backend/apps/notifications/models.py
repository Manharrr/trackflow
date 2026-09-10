from django.db import models

# Create your models here.
from django.conf import settings
# from django.db import models


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        SHIPMENT_ASSIGNED = "SHIPMENT_ASSIGNED", "Shipment Assigned"
        SHIPMENT_STATUS = "SHIPMENT_STATUS", "Shipment Status"
        DELAY_ALERT = "DELAY_ALERT", "Delay Alert"

    tenant = models.ForeignKey(
        "tenants.Client",
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )

    title = models.CharField(max_length=255)

    message = models.TextField()

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read"]
            ),
        ]

    def __str__(self):
        return f"{self.recipient} - {self.title}"