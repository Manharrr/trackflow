from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification


class NotificationService:

    @staticmethod
    def create(
        *,
        tenant,
        recipient,
        notification_type,
        title,
        message,
    ):
        """
        Creates and saves a Notification record in the database within tenant schema context.
        """
        from django_tenants.utils import schema_context
        with schema_context(tenant.schema_name):
            return Notification.objects.create(
                tenant=tenant,
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                message=message,
            )

    @staticmethod
    def push_realtime(notification, order_id=None):
        """
        Pushes a real-time notification payload to the recipient's websocket group.
        """
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        group_name = (
            f"notifications_{notification.tenant.id}_{notification.recipient.id}"
        )

        async_to_sync(
            channel_layer.group_send
        )(
            group_name,
            {
                "type": "notification.message",
                "notification": {
                    "id": notification.id,
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                    "read_at": notification.read_at.isoformat() if notification.read_at else None,
                    "order_id": str(order_id) if order_id else None,
                },
            },
        )