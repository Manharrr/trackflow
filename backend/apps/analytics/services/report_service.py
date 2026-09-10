from django.db.models import Count
from apps.orders.models.order import Order
from apps.employees.models.employee import Employee


class DailyReportService:

    @staticmethod
    def generate():
        total_orders = Order.objects.count()

        delivered_orders = Order.objects.filter(status="DELIVERED").count()

        delayed_orders = Order.objects.filter(status="DELAYED").count()

        pending_orders = Order.objects.exclude(
            status__in=["DELIVERED", "CANCELLED"]
        ).count()

        active_employees = Employee.objects.filter(is_active=True).count()

        return {
            "total_orders": total_orders,
            "delivered_orders": delivered_orders,
            "delayed_orders": delayed_orders,
            "pending_orders": pending_orders,
            "active_employees": active_employees,
        }