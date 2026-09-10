import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django_tenants.utils import schema_context
from apps.tenants.models import Client
from apps.analytics.services.report_service import DailyReportService

logger = logging.getLogger(__name__)


@shared_task
def send_daily_operations_summary():
    """
    Daily scheduled tenant-wise operations summary email.
    """
    logger.info("[Celery Beat] Starting daily operations summary task")

    tenants = Client.objects.exclude(schema_name="public")

    for tenant in tenants:
        with schema_context(tenant.schema_name):

            report = DailyReportService.generate()

            subject = f"TrackFlow AI - Daily Operations Summary ({tenant.name})"

            message = f"""
Hello {tenant.name},

Here is your daily operations summary.

Total Orders: {report['total_orders']}
Delivered Orders: {report['delivered_orders']}
Delayed Orders: {report['delayed_orders']}
Pending Orders: {report['pending_orders']}
Active Employees: {report['active_employees']}

Regards,
TrackFlow AI
"""

            recipient = getattr(tenant, "email", None)

            if recipient:
                try:
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[recipient],
                        fail_silently=False,
                    )

                    logger.info(
                        f"[Celery Beat] Summary email sent to tenant '{tenant.schema_name}' ({recipient})"
                    )

                except Exception as err:
                    logger.error(
                        f"[Celery Beat] Failed sending summary for tenant '{tenant.schema_name}': {str(err)}"
                    )

            else:
                logger.warning(
                    f"[Celery Beat] Tenant '{tenant.schema_name}' has no email configured."
                )

    logger.info("[Celery Beat] Daily operations summary task completed")