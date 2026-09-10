from django.db import transaction
from django.utils import timezone
from apps.orders.models.order import Order, OrderStatus
from apps.orders.models.history import OrderStatusHistory
from apps.orders.models.attempt import DeliveryAttempt
from apps.orders.models.audit import OrderAuditLog
from rest_framework.exceptions import ValidationError


class StatusService:
    
    VALID_TRANSITIONS = {
        OrderStatus.PENDING: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
        OrderStatus.ASSIGNED: [
            OrderStatus.PENDING, 
            OrderStatus.ASSIGNED, 
            OrderStatus.PICKED_UP, 
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED
        ],
        OrderStatus.PICKED_UP: [
            OrderStatus.ASSIGNED, 
            OrderStatus.IN_TRANSIT, 
            OrderStatus.OUT_FOR_DELIVERY, 
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED, 
            OrderStatus.RTO
        ],
        OrderStatus.IN_TRANSIT: [
            OrderStatus.ASSIGNED, 
            OrderStatus.OUT_FOR_DELIVERY, 
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED, 
            OrderStatus.FAILED, 
            OrderStatus.RTO
        ],
        OrderStatus.OUT_FOR_DELIVERY: [
            OrderStatus.ASSIGNED, 
            OrderStatus.IN_TRANSIT, 
            OrderStatus.DELIVERED, 
            OrderStatus.CANCELLED, 
            OrderStatus.FAILED, 
            OrderStatus.RTO
        ],
        OrderStatus.DELIVERED: [],
        OrderStatus.CANCELLED: [],
        OrderStatus.FAILED: [
            OrderStatus.ASSIGNED, 
            OrderStatus.IN_TRANSIT, 
            OrderStatus.OUT_FOR_DELIVERY, 
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED, 
            OrderStatus.RTO
        ],
        OrderStatus.RTO: [],
    }

    @classmethod
    def _validate_transition(cls, previous_status, new_status):
        if previous_status == new_status:
            return
        allowed = cls.VALID_TRANSITIONS.get(previous_status, [])
        if new_status not in allowed:
            raise ValidationError(
                {"status": f"Invalid status transition from {previous_status} to {new_status}."}
            )

    @classmethod
    @transaction.atomic
    def update_status(cls, *, order, new_status, user, remarks=""):
        """
        Validates transition and updates status.
        """
        previous_status = order.status
        cls._validate_transition(previous_status, new_status)

        order.status = new_status
        if new_status == OrderStatus.DELIVERED:
            order.actual_delivery_date = timezone.now()
        
        order.save(update_fields=["status", "actual_delivery_date"])

        # History log
        OrderStatusHistory.objects.create(
            order=order,
            previous_status=previous_status,
            current_status=new_status,
            remarks=remarks or f"Status updated to {new_status}.",
            changed_by=user,
        )

        # Audit log
        OrderAuditLog.objects.create(
            order=order,
            action="STATUS_UPDATE",
            changed_by=user,
            changes={
                "previous_status": previous_status,
                "current_status": new_status,
                "remarks": remarks,
            },
        )
        return order

    @classmethod
    @transaction.atomic
    def cancel_order(cls, *, order, user, reason):
        """
        Cancels an order with a reason description.
        """
        return cls.update_status(
            order=order,
            new_status=OrderStatus.CANCELLED,
            user=user,
            remarks=f"Order Cancelled. Reason: {reason}",
        )

    @classmethod
    @transaction.atomic
    def fail_delivery(cls, *, order, user, reason, remarks=""):
        """
        Logs a failed delivery attempt and sets status to Failed.
        """
        previous_status = order.status
        cls._validate_transition(previous_status, OrderStatus.FAILED)

        # Increment attempt counter
        order.attempt_count += 1
        order.status = OrderStatus.FAILED
        order.save(update_fields=["status", "attempt_count"])

        # Create DeliveryAttempt log
        employee_profile = getattr(user, "employee_profile", None)
        if not employee_profile:
            # Try loading from database
            from apps.employees.models import Employee
            employee_profile = Employee.objects.filter(user=user).first()

        DeliveryAttempt.objects.create(
            order=order,
            attempt_number=order.attempt_count,
            status="Failed",
            reason=reason,
            remarks=remarks,
            employee=employee_profile,
        )

        # Create histories
        OrderStatusHistory.objects.create(
            order=order,
            previous_status=previous_status,
            current_status=OrderStatus.FAILED,
            remarks=f"Delivery attempt #{order.attempt_count} failed: {reason}. {remarks}",
            changed_by=user,
        )

        OrderAuditLog.objects.create(
            order=order,
            action="STATUS_UPDATE",
            changed_by=user,
            changes={
                "previous_status": previous_status,
                "current_status": OrderStatus.FAILED,
                "attempt_number": order.attempt_count,
                "failed_reason": reason,
            },
        )

        return order

    @classmethod
    @transaction.atomic
    def mark_delayed(cls, *, order, user, reason, remarks=""):
        """
        Logs a delay attempt record without changing core status.
        """
        employee_profile = getattr(user, "employee_profile", None)
        if not employee_profile:
            from apps.employees.models import Employee
            employee_profile = Employee.objects.filter(user=user).first()

        DeliveryAttempt.objects.create(
            order=order,
            attempt_number=order.attempt_count + 1,  # projected number
            status="Delayed",
            reason=reason,
            remarks=remarks,
            employee=employee_profile,
        )

        OrderAuditLog.objects.create(
            order=order,
            action="DELAY",
            changed_by=user,
            changes={
                "delay_reason": reason,
                "remarks": remarks,
            },
        )

        return order
