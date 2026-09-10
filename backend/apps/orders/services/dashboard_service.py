from django.db.models import Q, Count, Avg, F, ExpressionWrapper, DurationField
from django.utils import timezone
from apps.orders.models.order import Order, OrderStatus, OrderPriority
from apps.employees.models import Employee, Role


class DashboardService:

    @staticmethod
    def get_dashboard_metrics(user, tenant):
        """
        Gathers role-specific dashboard aggregate metrics dynamically.
        """
        # Determine the user's role
        role = user.role if hasattr(user, "role") else "employee"

        # Check if employee profile exists to find driver specific scopes
        employee = Employee.objects.filter(user=user, tenant=tenant).first()
        if employee:
            role = employee.role

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)

        # 1. Company Admin
        if role == Role.COMPANY_ADMIN or user.is_superuser:
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timezone.timedelta(days=1)

            first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day_last_month = first_day_this_month - timezone.timedelta(days=1)
            first_day_last_month = last_day_last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            stats = Order.objects.filter(company=tenant, is_deleted=False).aggregate(
                total_orders=Count("id"),
                completed=Count("id", filter=Q(status=OrderStatus.DELIVERED)),
                pending=Count("id", filter=Q(status=OrderStatus.PENDING)),
                cancelled=Count("id", filter=Q(status=OrderStatus.CANCELLED)),
                failed=Count("id", filter=Q(status=OrderStatus.FAILED)),
                delayed=Count("id", filter=Q(attempts__status="Delayed")),
                today_orders=Count("id", filter=Q(created_at__range=(today_start, today_end))),
                last_month_orders=Count("id", filter=Q(created_at__range=(first_day_last_month, first_day_this_month))),
            )

            # Employees counts
            emp_stats = Employee.objects.filter(tenant=tenant).aggregate(
                total=Count("id"),
                couriers=Count("id", filter=Q(role=Role.EMPLOYEE)),
                managers=Count("id", filter=Q(role=Role.OPERATIONS_MANAGER)),
                active_couriers=Count("id", filter=Q(role=Role.EMPLOYEE, is_active=True, is_blocked=False)),
                blocked_couriers=Count("id", filter=Q(role=Role.EMPLOYEE, is_blocked=True)),
            )

            # Average delivery time calculation
            avg_delivery = Order.objects.filter(
                company=tenant,
                status=OrderStatus.DELIVERED,
                actual_delivery_date__isnull=False,
                is_deleted=False,
            ).annotate(
                delivery_duration=F("actual_delivery_date") - F("created_at")
            ).aggregate(
                avg_time=Avg("delivery_duration")
            )

            avg_seconds = 0
            if avg_delivery["avg_time"]:
                avg_seconds = int(avg_delivery["avg_time"].total_seconds())

            # High priority orders list
            high_priority_list = Order.objects.filter(
                company=tenant,
                priority__in=[OrderPriority.HIGH, OrderPriority.URGENT],
                is_deleted=False,
            ).exclude(
                status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
            )[:5]

            from apps.orders.serializers.order_serializers import OrderSerializer
            return {
                "role": "company_admin",
                "total_orders": stats["total_orders"],
                "today_orders": stats["today_orders"],
                "last_month_orders": stats["last_month_orders"],
                "completed": stats["completed"],
                "pending": stats["pending"],
                "cancelled": stats["cancelled"],
                "failed": stats["failed"],
                "delayed": stats["delayed"],
                "revenue": stats["completed"] * 2500,
                "average_delivery_seconds": avg_seconds,
                
                # Employee specs
                "total_employees": emp_stats["total"],
                "couriers_count": emp_stats["couriers"],
                "managers_count": emp_stats["managers"],
                "active_couriers": emp_stats["active_couriers"],
                "blocked_couriers": emp_stats["blocked_couriers"],

                "high_priority_orders": OrderSerializer(high_priority_list, many=True).data
            }

        # 2. Operations Manager
        elif role == Role.OPERATIONS_MANAGER:
            stats = Order.objects.filter(company=tenant, is_deleted=False).aggregate(
                total_orders=Count("id"),
                today_orders=Count("id", filter=Q(created_at__range=(today_start, today_end))),
                pending=Count("id", filter=Q(status=OrderStatus.PENDING)),
                assigned=Count("id", filter=Q(status=OrderStatus.ASSIGNED)),
                delivered=Count("id", filter=Q(status=OrderStatus.DELIVERED)),
                delayed=Count("id", filter=Q(attempts__status="Delayed")),
                cancelled=Count("id", filter=Q(status=OrderStatus.CANCELLED)),
                failed=Count("id", filter=Q(status=OrderStatus.FAILED)),
            )

            high_priority_list = Order.objects.filter(
                company=tenant,
                priority__in=[OrderPriority.HIGH, OrderPriority.URGENT],
                is_deleted=False,
            ).exclude(
                status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
            )[:5]

            from apps.orders.serializers.order_serializers import OrderSerializer
            return {
                "role": "operations_manager",
                "today_orders": stats["today_orders"],
                "pending": stats["pending"],
                "assigned": stats["assigned"],
                "delivered": stats["delivered"],
                "delayed": stats["delayed"],
                "cancelled": stats["cancelled"],
                "failed": stats["failed"],
                "high_priority_orders": OrderSerializer(high_priority_list, many=True).data
            }

        # 3. Delivery Partner (Driver / employee role)
        else:
            if not employee:
                return {
                    "role": "employee",
                    "assigned_orders": 0,
                    "completed_today": 0,
                    "pending": 0,
                    "today_deliveries": 0,
                }

            stats = Order.objects.filter(
                company=tenant,
                assigned_employee=employee,
                is_deleted=False
            ).aggregate(
                assigned_orders=Count("id"),
                completed_today=Count(
                    "id", 
                    filter=Q(status=OrderStatus.DELIVERED, actual_delivery_date__range=(today_start, today_end))
                ),
                pending=Count(
                    "id", 
                    filter=Q(status__in=[OrderStatus.PENDING, OrderStatus.ASSIGNED])
                ),
                today_deliveries=Count(
                    "id", 
                    filter=Q(expected_delivery_date__range=(today_start, today_end))
                ),
            )

            return {
                "role": "employee",
                "assigned_orders": stats["assigned_orders"],
                "completed_today": stats["completed_today"],
                "pending": stats["pending"],
                "today_deliveries": stats["today_deliveries"],
            }
