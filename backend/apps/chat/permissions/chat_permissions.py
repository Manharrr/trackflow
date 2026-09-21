from rest_framework import permissions
from apps.chat.models.conversation import Conversation
from apps.tenants.models import Client
from apps.tenants.utils import resolve_request_tenant


class IsConversationParticipant(permissions.BasePermission):
    """
    Object-level permission ensuring that the requesting user:
    1. Is authenticated.
    2. Belongs to the request tenant schema.
    3. Is a registered participant of the conversation.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if not tenant or not isinstance(tenant, Client):
            return False
        request.tenant = tenant
        return True

    def has_object_permission(self, request, view, obj):
        conversation = obj if isinstance(obj, Conversation) else getattr(obj, "conversation", None)
        if not conversation:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if not tenant or not isinstance(tenant, Client):
            return False

        # Verify tenant scope consistency
        if conversation.tenant_id != tenant.id:
            return False

        # Verify participant scope authorization
        return request.user.id == conversation.participant_one_id or request.user.id == conversation.participant_two_id
