from django.db import transaction
from django.core.exceptions import ValidationError
from django_tenants.utils import schema_context
from apps.tenants.models import Client
from apps.employees.models import Employee, Role
from apps.chat.models.conversation import Conversation


class ConversationService:

    @staticmethod
    def validate_participants(participant_one, participant_two):
        """
        Ensure participant_one does not equal participant_two.
        """
        if participant_one == participant_two:
            raise ValidationError("A conversation must have two distinct participants.")

    @staticmethod
    def validate_tenant(tenant: Client, participant_one, participant_two):
        """
        Ensure both participants belong to the request tenant.
        """
        with schema_context(tenant.schema_name):
            emp1_exists = Employee.objects.filter(user=participant_one, tenant=tenant, is_active=True).exists()
            emp2_exists = Employee.objects.filter(user=participant_two, tenant=tenant, is_active=True).exists()

            if not emp1_exists or not emp2_exists:
                raise ValidationError("Both participants must be active employees of this tenant.")

    @staticmethod
    def validate_roles(tenant: Client, participant_one, participant_two):
        """
        Check that both participants have active employee profiles inside this tenant.
        Delivery Partners (Role.EMPLOYEE) can only converse with:
        - Company Admin (Role.COMPANY_ADMIN)
        - Or their assigned manager (Role.OPERATIONS_MANAGER where emp.manager == manager_emp)
        """
        with schema_context(tenant.schema_name):
            emp1 = Employee.objects.filter(user=participant_one, tenant=tenant, is_active=True).first()
            emp2 = Employee.objects.filter(user=participant_two, tenant=tenant, is_active=True).first()

            if not emp1 or not emp2:
                raise ValidationError("Active employee profiles not found for participants.")

            # If participant_one is regular employee (driver)
            if emp1.role == Role.EMPLOYEE:
                if emp2.role == Role.EMPLOYEE:
                    raise ValidationError("Delivery partners cannot initiate conversations with other delivery partners.")
                if emp2.role == Role.OPERATIONS_MANAGER and emp1.manager_id != emp2.id:
                    raise ValidationError("Delivery partners can only chat with their assigned operations manager.")

            # If participant_two is regular employee (driver)
            if emp2.role == Role.EMPLOYEE:
                if emp1.role == Role.EMPLOYEE:
                    raise ValidationError("Delivery partners cannot initiate conversations with other delivery partners.")
                if emp1.role == Role.OPERATIONS_MANAGER and emp2.manager_id != emp1.id:
                    raise ValidationError("Delivery partners can only chat with their assigned operations manager.")

            return True

    @staticmethod
    @transaction.atomic
    def create_conversation(tenant: Client, participant_one, participant_two, created_by=None) -> Conversation:
        """
        Creates a new Conversation record after validating constraints.
        """
        ConversationService.validate_participants(participant_one, participant_two)
        ConversationService.validate_tenant(tenant, participant_one, participant_two)
        ConversationService.validate_roles(tenant, participant_one, participant_two)

        p1, p2 = participant_one, participant_two
        if str(p1.id) > str(p2.id):
            p1, p2 = p2, p1

        with schema_context(tenant.schema_name):
            return Conversation.objects.create(
                tenant=tenant,
                participant_one=p1,
                participant_two=p2,
                created_by=created_by,
            )

    @staticmethod
    @transaction.atomic
    def get_or_create_conversation(tenant: Client, participant_one, participant_two, created_by=None) -> tuple:
        """
        Retrieves or creates a Conversation. Enforces role checks on creation.
        """
        ConversationService.validate_participants(participant_one, participant_two)
        ConversationService.validate_tenant(tenant, participant_one, participant_two)

        p1, p2 = participant_one, participant_two
        if str(p1.id) > str(p2.id):
            p1, p2 = p2, p1

        with schema_context(tenant.schema_name):
            conversation = Conversation.objects.filter(
                tenant=tenant,
                participant_one=p1,
                participant_two=p2
            ).first()

            if conversation:
                return conversation, False

            # Run role checks only on creation to keep read requests fast
            ConversationService.validate_roles(tenant, p1, p2)

            conversation = Conversation.objects.create(
                tenant=tenant,
                participant_one=p1,
                participant_two=p2,
                created_by=created_by,
            )
            return conversation, True
