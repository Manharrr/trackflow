from django.db import transaction
from django.utils import timezone
from apps.orders.models.order import Order, OrderStatus
from apps.orders.models.history import OrderStatusHistory
from apps.orders.models.audit import OrderAuditLog
from rest_framework.exceptions import ValidationError


class OrderService:

    @staticmethod
    @transaction.atomic
    def create_order(*, tenant, OM_user, data):
        """
        Creates a new Order inside the active tenant schema.
        """
        # Validate customer phone (basic length check or format check)
        phone = data.get("customer_phone", "").strip()
        if not phone:
            raise ValidationError({"customer_phone": "Customer phone is required."})

        # Expected delivery date check
        expected_date = data.get("expected_delivery_date")
        if expected_date and expected_date < timezone.now():
            raise ValidationError(
                {"expected_delivery_date": "Expected delivery date cannot be in the past."}
            )

        assigned_employee = data.get("assigned_employee")
        status_val = OrderStatus.PENDING
        if assigned_employee:
            status_val = OrderStatus.ASSIGNED

        order = Order.objects.create(
            company=tenant,
            customer_name=data.get("customer_name"),
            customer_phone=phone,
            customer_email=data.get("customer_email", ""),
            pickup_address=data.get("pickup_address"),
            delivery_address=data.get("delivery_address"),
            priority=data.get("priority", "Medium"),
            expected_delivery_date=expected_date,
            internal_notes=data.get("internal_notes", ""),
            status=status_val,
            assigned_employee=assigned_employee,
            assigned_by=OM_user if assigned_employee else None,
        )

        # Log initial Pending status history
        OrderStatusHistory.objects.create(
            order=order,
            previous_status="",
            current_status=OrderStatus.PENDING,
            remarks="Order Created",
            changed_by=OM_user,
        )

        # Log initial assignment if driver provided
        if assigned_employee:
            from apps.orders.models.history import AssignmentHistory
            OrderStatusHistory.objects.create(
                order=order,
                previous_status=OrderStatus.PENDING,
                current_status=OrderStatus.ASSIGNED,
                remarks=f"Order assigned to {assigned_employee.full_name} on creation.",
                changed_by=OM_user,
            )
            AssignmentHistory.objects.create(
                order=order,
                old_employee=None,
                new_employee=assigned_employee,
                assigned_by=OM_user,
                reason="Assigned on order creation",
            )

        # Log CREATE action
        OrderAuditLog.objects.create(
            order=order,
            action="CREATE",
            changed_by=OM_user,
            changes={
                "description": "Order Created",
                "customer_name": order.customer_name,
                "tracking_id": order.tracking_id,
            },
        )

        # Log ASSIGN audit log if driver provided
        if assigned_employee:
            OrderAuditLog.objects.create(
                order=order,
                action="ASSIGN",
                changed_by=OM_user,
                changes={
                    "description": f"Order assigned to {assigned_employee.full_name}.",
                    "assigned_employee_id": str(assigned_employee.id),
                    "employee_name": assigned_employee.full_name,
                },
            )

            # Trigger notification
            from apps.notifications.services import NotificationService
            from apps.notifications.models import Notification
            notification = NotificationService.create(
                tenant=tenant,
                recipient=assigned_employee.user,
                notification_type=Notification.NotificationType.SHIPMENT_ASSIGNED,
                title="New Shipment Assigned",
                message=f"A new shipment {order.tracking_id or ''} has been assigned to you.",
            )
            transaction.on_commit(lambda: NotificationService.push_realtime(notification, order_id=order.id))

        return order

    @staticmethod
    @transaction.atomic
    def update_order(*, order, data, changed_by):
        """
        Updates details of an Order and logs changes.
        """
        # Prevent updates on Delivered or Cancelled orders
        if order.status in ["Delivered", "Cancelled"]:
            raise ValidationError(
                {"detail": f"Cannot modify order details when order status is {order.status}."}
            )

        changes = {}
        fields_to_update = [
            "customer_name",
            "customer_phone",
            "customer_email",
            "pickup_address",
            "delivery_address",
            "priority",
            "expected_delivery_date",
            "internal_notes",
        ]

        for field in fields_to_update:
            if field in data:
                old_val = getattr(order, field)
                new_val = data[field]
                if old_val != new_val:
                    setattr(order, field, new_val)
                    changes[field] = {
                        "old": str(old_val) if old_val else "",
                        "new": str(new_val) if new_val else "",
                    }

        if changes:
            order.save()
            OrderAuditLog.objects.create(
                order=order,
                action="UPDATE",
                changed_by=changed_by,
                changes=changes,
            )

        return order

    @staticmethod
    @transaction.atomic
    def soft_delete_order(*, order, user):
        """
        Flags an Order as deleted.
        """
        if order.is_deleted:
            raise ValidationError({"detail": "Order is already deleted."})

        order.is_deleted = True
        order.deleted_at = timezone.now()
        order.save(update_fields=["is_deleted", "deleted_at"])

        OrderAuditLog.objects.create(
            order=order,
            action="DELETE",
            changed_by=user,
            changes={"is_deleted": True},
        )
        return order

    @staticmethod
    @transaction.atomic
    def restore_order(*, order, user):
        """
        Restores a soft-deleted Order.
        """
        if not order.is_deleted:
            raise ValidationError({"detail": "Order is not deleted."})

        order.is_deleted = False
        order.deleted_at = None
        order.save(update_fields=["is_deleted", "deleted_at"])

        OrderAuditLog.objects.create(
            order=order,
            action="RESTORE",
            changed_by=user,
            changes={"is_deleted": False},
        )
        return order
