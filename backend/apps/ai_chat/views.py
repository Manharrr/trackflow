from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .services import ask_ai


class ChatbotAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        question = request.data.get("question")

        if not question:
            return Response(
                {"error": "Question is required"},
                status=400
            )

        # Safely resolve tenant_id
        tenant_id = None
        if hasattr(request, "tenant") and request.tenant:
            tenant_id = getattr(request.tenant, "id", None)
        if tenant_id is None:
            tenant_id = request.data.get("tenant_id")

        history = request.data.get("history", [])
        is_public = request.data.get("is_public", True if tenant_id is None else False)

        result = ask_ai(
            question=question,
            tenant_id=tenant_id,
            history=history,
            is_public=is_public,
        )

        return Response(result)