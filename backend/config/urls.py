"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include

from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/super-admin/", include("apps.tenants.urls")),
    path("api/employees/", include("apps.employees.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/passwords/", include("apps.passwords.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/conversations/", include([
        path("", __import__("apps.chat.views", fromlist=["ConversationListAPIView"]).ConversationListAPIView.as_view(), name="root-conversations-list"),
        path("create/", __import__("apps.chat.views", fromlist=["ConversationCreateAPIView"]).ConversationCreateAPIView.as_view(), name="root-conversations-create"),
        path("<uuid:pk>/", __import__("apps.chat.views", fromlist=["ConversationDetailAPIView"]).ConversationDetailAPIView.as_view(), name="root-conversations-detail"),
        path("<uuid:conversation_id>/messages/", __import__("apps.chat.views", fromlist=["MessageListAPIView"]).MessageListAPIView.as_view(), name="root-conversations-messages"),
    ])),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/", include("apps.ai_chat.urls")),
    path("api/team-overview/", include([
        path("", __import__("apps.orders.views.operations_views", fromlist=["OperationsTeamOverviewAPIView"]).OperationsTeamOverviewAPIView.as_view(), name="root-team-overview"),
    ])),
    path("api/leaderboard/", include([
        path("", __import__("apps.orders.views.operations_views", fromlist=["OperationsLeaderboardAPIView"]).OperationsLeaderboardAPIView.as_view(), name="root-leaderboard"),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
