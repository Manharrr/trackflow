from django.urls import path

from .views import (
    CompanyListAPIView,
    PendingCompanyAPIView,
    ApproveCompanyAPIView,
    RejectCompanyAPIView,
    CompanyDetailAPIView,
    SuperAdminDashboardAPIView,
    CreateCheckoutSessionAPIView,
    StripeWebhookAPIView,
    SubscriptionStatusAPIView,
)

urlpatterns = [

    path('companies/',CompanyListAPIView.as_view()),
    path('companies/pending/',PendingCompanyAPIView.as_view()),

    path('companies/<int:pk>/approve/',ApproveCompanyAPIView.as_view()),
    path('companies/<int:pk>/reject/',RejectCompanyAPIView.as_view()),
    path("companies/<int:pk>/",CompanyDetailAPIView.as_view(),),
    path("dashboard/",SuperAdminDashboardAPIView.as_view(),),
    path("payments/create-checkout/",CreateCheckoutSessionAPIView.as_view(),),
    path("payments/subscription-status/",SubscriptionStatusAPIView.as_view(),),
    path(
    "payments/webhook/",
    StripeWebhookAPIView.as_view(),
),

]