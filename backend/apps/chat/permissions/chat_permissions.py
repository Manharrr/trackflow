from rest_framework import permissions
from apps.chat.models.conversation import Conversation


class IsConversationParticipant(permissions.BasePermission):
    """
    Object-level permission ensuring that the requesting user:
    1. Is authenticated.
    2. Belongs to the request tenant schema.
    3. Is a registered participant of the conversation.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        conversation = obj if isinstance(obj, Conversation) else getattr(obj, "conversation", None)
        if not conversation:
            return False

        # Verify tenant scope consistency
        if conversation.tenant != request.tenant:
            return False

        # Verify participant scope authorization
        return request.user == conversation.participant_one or request.user == conversation.participant_two
