from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.employees.serializers.activation_serializers import (
    ActivationTokenSerializer,
    SetPasswordSerializer,
)

from apps.employees.services.activation_service import ActivationService


class VerifyActivationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ActivationTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        activation = ActivationService.verify_token(
            serializer.validated_data["token"]
        )

        return Response(
            {
                "message": "Activation token is valid.",
                "email": activation.user.email,
            },
            status=status.HTTP_200_OK,
        )


class ActivateAccountAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = ActivationService.activate_account(
            token=serializer.validated_data["token"],
            password=serializer.validated_data["password"],
        )

        return Response(
            {
                "message": "Account activated successfully.",
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )