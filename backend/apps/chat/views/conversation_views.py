from django.db.models import Q
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.chat.models.conversation import Conversation
from apps.chat.permissions.chat_permissions import IsConversationParticipant
from apps.chat.serializers.conversation_serializer import (
    ConversationSerializer,
    ConversationCreateSerializer,
)
from apps.chat.services.conversation_service import ConversationService


class ConversationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Lists all conversations for the authenticated user inside this tenant.
        """
        tenant = request.tenant
        user = request.user

        # Query and pre-fetch participant profiles to prevent N+1 queries
        conversations = Conversation.objects.filter(
            tenant=tenant,
            is_active=True
        ).filter(
            Q(participant_one=user) | Q(participant_two=user)
        ).select_related("participant_one", "participant_two", "created_by")

        serializer = ConversationSerializer(conversations, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ConversationCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Creates or retrieves a conversation with a target participant.
        """
        serializer = ConversationCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        tenant = request.tenant
        user = request.user
        participant = serializer.validated_data["participant_two"]

        # Call Service Layer to handle lookup or creation validations
        conversation, created = ConversationService.get_or_create_conversation(
            tenant=tenant,
            participant_one=user,
            participant_two=participant,
            created_by=user,
        )

        response_serializer = ConversationSerializer(conversation, context={"request": request})
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=status_code)


class ConversationDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        """
        Retrieves details of a specific conversation.
        """
        tenant = request.tenant
        try:
            conversation = Conversation.objects.select_related(
                "participant_one", "participant_two", "created_by"
            ).get(id=pk, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check object level permissions explicitly
        self.check_object_permissions(request, conversation)

        serializer = ConversationSerializer(conversation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatDirectoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.employees.models import Employee
        tenant = request.tenant
        
        # Search query filter
        search_query = request.query_params.get("search", "").strip()
        
        queryset = Employee.objects.filter(tenant=tenant, is_active=True).exclude(user=request.user)
        if search_query:
            queryset = queryset.filter(full_name__icontains=search_query)
            
        data = []
        for emp in queryset[:50]:  # Limit to 50 results
            data.append({
                "id": str(emp.id),
                "full_name": emp.full_name,
                "role": emp.role,
                "email": emp.email,
            })
        return Response({"results": data})
