from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import ask_ai


class ChatbotAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        question = request.data.get("question")

        if not question:
            return Response(
                {"error": "Question is required"},
                status=400
            )

        tenant_id = request.tenant.id

        result = ask_ai(
            question=question,
            tenant_id=tenant_id
        )

        return Response(result)