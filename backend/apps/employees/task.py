import logging
from celery import shared_task
from django_tenants.utils import schema_context
from apps.tenants.models import Client
from apps.employees.models.employee import Employee
from apps.employees.models import AccountActivation
from apps.employees.services.email_service import EmailService

from django.utils import timezone


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5)
def send_welcome_email(self, tenant_schema_name, employee_id):
    task_id = self.request.id
    retry_count = self.request.retries
    
    logger.info(
        f"[Celery Task] Initiating welcome email. "
        f"TaskID: {task_id} | Schema: {tenant_schema_name} | EmployeeID: {employee_id} | Retry: {retry_count}"
    )

    try:
        tenant = Client.objects.get(schema_name=tenant_schema_name)
    except Client.DoesNotExist as err:
        logger.error(
            f"[Celery Task] Tenant schema '{tenant_schema_name}' not found in database. "
            f"TaskID: {task_id} | EmployeeID: {employee_id} | Error: {str(err)}"
        )
        return f"Tenant {tenant_schema_name} not found"

    with schema_context(tenant.schema_name):
        try:
            employee = Employee.objects.select_related("user").get(id=employee_id)
            user = employee.user
            
            # Idempotency check: fetch unused AccountActivation token
            activation = AccountActivation.objects.filter(user=user, is_used=False).first()
            if not activation:
                logger.warning(
                    f"[Celery Task] Idempotency triggered. Unused activation token not found or already verified for User {user.email}. Skipping email send. "
                    f"TaskID: {task_id} | Schema: {tenant_schema_name} | EmployeeID: {employee_id}"
                )
                return "Skipped: Account already active or token not found"

            # Trigger email transmission
            EmailService.send_activation_email(
                tenant=tenant,
                user=user,
                activation=activation,
            )
            
            logger.info(
                f"[Celery Task] Welcome email successfully sent. "
                f"TaskID: {task_id} | Schema: {tenant_schema_name} | EmployeeID: {employee_id} | Recipient: {user.email}"
            )
            return f"Welcome email sent to {user.email}"

        except Employee.DoesNotExist as err:
            logger.error(
                f"[Celery Task] Employee '{employee_id}' not found in schema '{tenant_schema_name}'. "
                f"TaskID: {task_id} | Error: {str(err)}"
            )
            return f"Employee {employee_id} not found"

        except Exception as err:
            # Trigger celery task retry with exponential backoff on transport failures
            countdown = 60 * (2 ** retry_count)
            logger.warning(
                f"[Celery Task] Temporary failure sending welcome email. Retrying task in {countdown}s. "
                f"TaskID: {task_id} | Schema: {tenant_schema_name} | EmployeeID: {employee_id} | Error: {str(err)}"
            )
            try:
                self.retry(exc=err, countdown=countdown)
            except Exception as retry_err:
                logger.error(
                    f"[Celery Task] Max retries exceeded or queue error. "
                    f"TaskID: {task_id} | Schema: {tenant_schema_name} | EmployeeID: {employee_id} | Error: {str(retry_err)}"
                )
                raise retry_err


@shared_task
def hello_task():
    print("Hello from Celery!")
    return "Task Completed"

# @shared_task
# def cleanup_expired_activations():
#     """
#     Deletes expired and unused activation tokens.
#     Runs daily via Celery Beat.
#     """
#     deleted_count, _ = AccountActivation.objects.filter(
#         expires_at__lt=timezone.now(),
#         is_used=False
#     ).delete()

#     logger.info(
#         f"[Celery Beat] Deleted {deleted_count} expired activation tokens."
#     )

#     return f"Deleted {deleted_count} expired activation tokens"
from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context
from apps.tenants.models import Client
from apps.employees.models import AccountActivation
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_activations():
    total_deleted = 0

    # tenants = Client.objects.all()
    tenants = Client.objects.exclude(schema_name="public")


    for tenant in tenants:
        with schema_context(tenant.schema_name):

            deleted_count, _ = AccountActivation.objects.filter(
                expires_at__lt=timezone.now(),
                is_used=False
            ).delete()

            total_deleted += deleted_count

            logger.info(
                f"[Celery Beat] Tenant '{tenant.schema_name}': "
                f"Deleted {deleted_count} expired activation tokens."
            )

    logger.info(
        f"[Celery Beat] Cleanup completed. Total deleted: {total_deleted}"
    )

    return f"Total deleted: {total_deleted}"