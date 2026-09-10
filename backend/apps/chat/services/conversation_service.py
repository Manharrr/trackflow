from django.db import transaction
from django.core.exceptions import ValidationError
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
        emp1_exists = Employee.objects.filter(user=participant_one, tenant=tenant, is_active=True).exists()
        emp2_exists = Employee.objects.filter(user=participant_two, tenant=tenant, is_active=True).exists()

        if not emp1_exists or not emp2_exists:
            raise ValidationError("Both participants must be active employees of this tenant.")

    @staticmethod
    def validate_roles(tenant: Client, participant_one, participant_two):
        """
        Check that both participants have active employee profiles inside this tenant.
        """
        emp1 = Employee.objects.filter(user=participant_one, tenant=tenant, is_active=True).first()
        emp2 = Employee.objects.filter(user=participant_two, tenant=tenant, is_active=True).first()

        if not emp1 or not emp2:
            raise ValidationError("Active employee profiles not found for participants.")

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
