from django.urls import path
from .views import (
    CompanyRegisterAPIView,
    VerifyOTPAPIView,
    ResendOTPAPIView,
    GoogleLoginAPIView,
    CompleteCompanySetupAPIView,
    PhoneLoginAPIView,
    MFASetupAPIView,
    MFAVerifyAPIView,
    MFALoginAPIView,
    LogoutAPIView,
    RefreshAPIView,
    MeAPIView,
    ForgotPasswordAPIView,
    VerifyResetOTPAPIView,
    ResetPasswordAPIView,
    ChangePasswordAPIView,
)

urlpatterns = [
    # Phone Registration & Verification
    path("register/", CompanyRegisterAPIView.as_view(), name="register"),
    path("verify-otp/", VerifyOTPAPIView.as_view(), name="verify-otp"),
    path("verify-phone/", VerifyOTPAPIView.as_view(), name="verify-phone"),
    path("resend-otp/", ResendOTPAPIView.as_view(), name="resend-otp"),
    path("resend-code/", ResendOTPAPIView.as_view(), name="resend-code"),

    # Google SSO
    path("google/", GoogleLoginAPIView.as_view(), name="google-login"),
    path("complete-setup/", CompleteCompanySetupAPIView.as_view(), name="complete-setup"),

    # Phone Login
    path("login/", PhoneLoginAPIView.as_view(), name="login"),

    # MFA Management
    path("mfa/setup/", MFASetupAPIView.as_view(), name="mfa-setup"),
    path("mfa/verify/", MFAVerifyAPIView.as_view(), name="mfa-verify"),
    path("mfa/login/", MFALoginAPIView.as_view(), name="mfa-login"),

    # Session Management
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("token/refresh/", RefreshAPIView.as_view(), name="token-refresh"),
    path("me/", MeAPIView.as_view(), name="me"),

    # Forgot / Reset Password
    path("forgot-password/", ForgotPasswordAPIView.as_view(), name="forgot-password"),
    path("verify-reset-otp/", VerifyResetOTPAPIView.as_view(), name="verify-reset-otp"),
    path("reset-password/", ResetPasswordAPIView.as_view(), name="reset-password"),
    path("change-password/", ChangePasswordAPIView.as_view(), name="change-password"),
]
