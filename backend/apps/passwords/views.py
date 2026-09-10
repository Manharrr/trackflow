from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.passwords.serializers import (
    ForgotPasswordSerializer,
    VerifyResetOTPSerializer,
    ResetPasswordSerializer,
)
from apps.passwords.services import (
    create_password_reset_token,
    verify_password_reset_otp,
    reset_password_with_otp,
)


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        # Dispatches the password reset OTP via SMS
        create_password_reset_token(phone=phone)

        return Response(
            {"message": "Password reset OTP sent successfully via SMS."},
            status=status.HTTP_200_OK,
        )


class VerifyResetOTPAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = serializer.validated_data["otp"]

        # Verifies the OTP matches
        verify_password_reset_otp(phone=phone, otp=otp)

        return Response(
            {"message": "OTP verified successfully. You may proceed to reset your password."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = serializer.validated_data["otp"]
        password = serializer.validated_data["password"]

        # Validates and updates user password in a transaction
        reset_password_with_otp(phone=phone, otp=otp, password=password)

        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )
