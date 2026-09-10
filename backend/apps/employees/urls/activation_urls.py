from django.urls import path

from apps.employees.views.activation_view import (
    VerifyActivationAPIView,
    ActivateAccountAPIView,
)

urlpatterns = [
    path("verify/",VerifyActivationAPIView.as_view(),name="verify-activation",),
    path("activate/",ActivateAccountAPIView.as_view(),name="activate-account",),
]