from django.db import transaction
from apps.orders.models.order import Order, OrderStatus
from apps.orders.models.history import AssignmentHistory, OrderStatusHistory
from apps.orders.models.audit import OrderAuditLog
from apps.employees.models import Employee
from rest_framework.exceptions import ValidationError


class AssignmentService:

    @staticmethod
    def _validate_employee(employee, tenant):
        """
        Enforce active status and tenant cross-boundary limits.
        """
        if not employee.is_active or employee.is_blocked:
            raise ValidationError(
                {"employee": f"Cannot assign inactive employee: {employee.full_name}."}
            )
        if employee.tenant != tenant:
            raise ValidationError(
                {"employee": "Cannot assign employee belonging to another tenant."}
            )

    @classmethod
    @transaction.atomic
    def assign_order(cls, *, order, employee, assigned_by):
        """
        Assigns an order to an employee (Delivery Executive).
        """
        if order.status in ["Delivered", "Cancelled"]:
            raise ValidationError(
                {"detail": f"Cannot assign order when status is {order.status}."}
            )

        cls._validate_employee(employee, order.company)

        old_employee = order.assigned_employee
        if old_employee == employee:
            return order  # Already assigned to this courier

        action = "ASSIGN" if not old_employee else "REASSIGN"
        previous_status = order.status

        # Update order columns
        order.assigned_employee = employee
        order.assigned_by = assigned_by
        order.status = OrderStatus.ASSIGNED
        order.save(update_fields=["assigned_employee", "assigned_by", "status"])

        # Write log histories
        AssignmentHistory.objects.create(
            order=order,
            old_employee=old_employee,
            new_employee=employee,
            assigned_by=assigned_by,
            reason="Initial assignment" if action == "ASSIGN" else "Courier switch",
        )

        if previous_status != OrderStatus.ASSIGNED:
            OrderStatusHistory.objects.create(
                order=order,
                previous_status=previous_status,
                current_status=OrderStatus.ASSIGNED,
                remarks=f"Order assigned to {employee.full_name}.",
                changed_by=assigned_by,
            )

        OrderAuditLog.objects.create(
            order=order,
            action=action,
            changed_by=assigned_by,
            changes={
                "assigned_employee_id": str(employee.id),
                "employee_name": employee.full_name,
            },
        )

        # Trigger notification
        from apps.notifications.services import NotificationService
        from apps.notifications.models import Notification
        notification = NotificationService.create(
            tenant=order.company,
            recipient=employee.user,
            notification_type=Notification.NotificationType.SHIPMENT_ASSIGNED,
            title="New Shipment Assigned",
            message=f"A new shipment {order.tracking_id or ''} has been assigned to you.",
        )
        transaction.on_commit(lambda: NotificationService.push_realtime(notification, order_id=order.id))

        return order

    @classmethod
    @transaction.atomic
    def reassign_order(cls, *, order, new_employee, assigned_by, reason):
        """
        Reassigns an order with an explicit reason explanation.
        """
        if order.status in ["Delivered", "Cancelled"]:
            raise ValidationError(
                {"detail": f"Cannot reassign order when status is {order.status}."}
            )

        cls._validate_employee(new_employee, order.company)

        old_employee = order.assigned_employee
        if old_employee == new_employee:
            return order

        previous_status = order.status

        order.assigned_employee = new_employee
        order.assigned_by = assigned_by
        order.status = OrderStatus.ASSIGNED
        order.save(update_fields=["assigned_employee", "assigned_by", "status"])

        AssignmentHistory.objects.create(
            order=order,
            old_employee=old_employee,
            new_employee=new_employee,
            assigned_by=assigned_by,
            reason=reason,
        )

        if previous_status != OrderStatus.ASSIGNED:
            OrderStatusHistory.objects.create(
                order=order,
                previous_status=previous_status,
                current_status=OrderStatus.ASSIGNED,
                remarks=f"Order reassigned: {reason}",
                changed_by=assigned_by,
            )

        OrderAuditLog.objects.create(
            order=order,
            action="REASSIGN",
            changed_by=assigned_by,
            changes={
                "old_employee_id": str(old_employee.id) if old_employee else "",
                "new_employee_id": str(new_employee.id),
                "reason": reason,
            },
        )

        # Trigger notification
        from apps.notifications.services import NotificationService
        from apps.notifications.models import Notification
        notification = NotificationService.create(
            tenant=order.company,
            recipient=new_employee.user,
            notification_type=Notification.NotificationType.SHIPMENT_ASSIGNED,
            title="New Shipment Assigned",
            message=f"A new shipment {order.tracking_id or ''} has been assigned to you.",
        )
        transaction.on_commit(lambda: NotificationService.push_realtime(notification, order_id=order.id))

        return order

    @classmethod
    @transaction.atomic
    def bulk_assign_orders(cls, *, order_ids, employee, assigned_by, tenant):
        """
        Assigns multiple orders to a driver in a single batch operation.
        """
        cls._validate_employee(employee, tenant)

        orders = Order.objects.select_for_update().filter(
            id__in=order_ids,
            company=tenant,
            is_deleted=False,
        )

        assigned_orders = []
        for order in orders:
            # Skip delivered/cancelled orders
            if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
                continue

            old_employee = order.assigned_employee
            if old_employee == employee:
                continue

            action = "ASSIGN" if not old_employee else "REASSIGN"
            previous_status = order.status

            order.assigned_employee = employee
            order.assigned_by = assigned_by
            order.status = OrderStatus.ASSIGNED
            order.save(update_fields=["assigned_employee", "assigned_by", "status"])

            AssignmentHistory.objects.create(
                order=order,
                old_employee=old_employee,
                new_employee=employee,
                assigned_by=assigned_by,
                reason="Bulk courier assignment",
            )

            if previous_status != OrderStatus.ASSIGNED:
                OrderStatusHistory.objects.create(
                    order=order,
                    previous_status=previous_status,
                    current_status=OrderStatus.ASSIGNED,
                    remarks="Assigned via bulk operations panel.",
                    changed_by=assigned_by,
                )

            OrderAuditLog.objects.create(
                order=order,
                action=action,
                changed_by=assigned_by,
                changes={
                    "assigned_employee_id": str(employee.id),
                    "bulk": True,
                },
            )
            assigned_orders.append(order)

            # Trigger notification
            from apps.notifications.services import NotificationService
            from apps.notifications.models import Notification
            notification = NotificationService.create(
                tenant=tenant,
                recipient=employee.user,
                notification_type=Notification.NotificationType.SHIPMENT_ASSIGNED,
                title="New Shipment Assigned",
                message=f"A new shipment {order.tracking_id or ''} has been assigned to you.",
            )
            def trigger_push(n=notification, o_id=order.id):
                NotificationService.push_realtime(n, order_id=o_id)
            transaction.on_commit(trigger_push)

        return assigned_orders
