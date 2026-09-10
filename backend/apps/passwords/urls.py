from django.urls import path
from .views import (
    ForgotPasswordAPIView,
    VerifyResetOTPAPIView,
    ResetPasswordAPIView,
)

urlpatterns = [
    path("forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("verify-otp/", VerifyResetOTPAPIView.as_view(), name="verify-reset-otp"),
    path("reset-password/", ResetPasswordAPIView.as_view(), name="reset-password"),
]
