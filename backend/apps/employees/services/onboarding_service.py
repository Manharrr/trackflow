from django.db import transaction

from apps.employees.services.employee_service import EmployeeService
from apps.employees.services.activation_service import ActivationService
from apps.employees.services.email_service import EmailService


class EmployeeOnboardingService:

    @staticmethod
    @transaction.atomic
    def create_employee(
        *,
        tenant,
        full_name,
        email,
        phone,
        role,
        department="",
        designation="",
        manager=None,
        address="",
        emergency_contact="",
        joined_at=None,
        created_by=None,
    ):
        """
        Complete employee onboarding flow.

        1. Create User
        2. Create UserTenant
        3. Create Employee
        4. Create Activation Token
        5. Send Activation Email
        """

        employee = EmployeeService.create_employee(
            tenant=tenant,
            full_name=full_name,
            email=email,
            phone=phone,
            role=role,
            department=department,
            designation=designation,
            manager=manager,
            address=address,
            emergency_contact=emergency_contact,
            joined_at=joined_at,
            created_by=created_by,
        )

        activation = ActivationService.create_activation(
            employee.user
        )

        try:
            from apps.employees.task import send_welcome_email
            send_welcome_email.delay(
                tenant.schema_name,
                employee.id
            )
        except Exception as err:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception(
                f"[Celery Publish Error] Failed to publish send_welcome_email task. "
                f"Schema: {tenant.schema_name} | EmployeeID: {employee.id} | Error: {str(err)}"
            )

        return employee