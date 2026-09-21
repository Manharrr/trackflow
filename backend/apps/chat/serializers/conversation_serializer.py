from rest_framework import serializers
from django.core.exceptions import ValidationError
from django_tenants.utils import schema_context
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.chat.models.conversation import Conversation
from apps.chat.services.message_service import MessageService


class ChatUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "phone", "role"]

    def get_role(self, obj):
        request = self.context.get("request")
        if request:
            tenant = getattr(request, "tenant", None)
            if tenant:
                from apps.tenants.models import Client
                if isinstance(tenant, Client):
                    from apps.employees.models import Employee
                    with schema_context(tenant.schema_name):
                        emp = Employee.objects.filter(user=obj, tenant=tenant).first()
                        return emp.role if emp else None
        return None


class ConversationSerializer(serializers.ModelSerializer):
    participant_one = ChatUserSerializer(read_only=True)
    participant_two = ChatUserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "participant_one",
            "participant_two",
            "created_by",
            "is_active",
            "created_at",
            "updated_at",
            "last_message",
            "last_message_time",
            "unread_count",
        ]

    def get_last_message(self, obj):
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) if request else getattr(obj, "tenant", None)
        if tenant and hasattr(tenant, "schema_name"):
            with schema_context(tenant.schema_name):
                last_msg = MessageService.get_last_message(obj)
                return last_msg.message if last_msg else None
        last_msg = MessageService.get_last_message(obj)
        return last_msg.message if last_msg else None

    def get_last_message_time(self, obj):
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) if request else getattr(obj, "tenant", None)
        if tenant and hasattr(tenant, "schema_name"):
            with schema_context(tenant.schema_name):
                last_msg = MessageService.get_last_message(obj)
                return last_msg.created_at if last_msg else None
        last_msg = MessageService.get_last_message(obj)
        return last_msg.created_at if last_msg else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request and request.user:
            tenant = getattr(request, "tenant", None) or getattr(obj, "tenant", None)
            if tenant and hasattr(tenant, "schema_name"):
                with schema_context(tenant.schema_name):
                    return MessageService.get_unread_count(obj, request.user)
            return MessageService.get_unread_count(obj, request.user)
        return 0


class ConversationCreateSerializer(serializers.Serializer):
    participant_id = serializers.CharField(required=True, write_only=True)

    def validate_participant_id(self, value):
        import uuid
        from django.contrib.auth import get_user_model
        from apps.employees.models.employee import Employee
        
        User = get_user_model()
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) if request else None

        # 1. Try resolving as Employee UUID
        try:
            val_uuid = uuid.UUID(str(value))
            try:
                if tenant and hasattr(tenant, "schema_name"):
                    with schema_context(tenant.schema_name):
                        employee = Employee.objects.select_related("user").get(id=val_uuid)
                else:
                    employee = Employee.objects.select_related("user").get(id=val_uuid)
                return employee.user
            except Employee.DoesNotExist:
                raise serializers.ValidationError("Target employee participant not found.")
        except ValueError:
            # 2. Try resolving as User Integer ID
            try:
                val_int = int(value)
                return User.objects.get(id=val_int)
            except (ValueError, User.DoesNotExist):
                raise serializers.ValidationError("Target user participant not found.")

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user:
            raise serializers.ValidationError("User authentication required.")

        tenant = request.tenant
        user = request.user
        participant = attrs["participant_id"]

        from apps.chat.services.conversation_service import ConversationService
        try:
            ConversationService.validate_participants(user, participant)
            ConversationService.validate_tenant(tenant, user, participant)
            ConversationService.validate_roles(tenant, user, participant)
        except ValidationError as e:
            msg = e.messages[0] if hasattr(e, "messages") else str(e)
            raise serializers.ValidationError(msg)

        attrs["participant_one"] = user
        attrs["participant_two"] = participant
        return attrs
