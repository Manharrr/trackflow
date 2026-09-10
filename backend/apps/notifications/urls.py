from django.urls import path

from .views import (
    NotificationListAPIView,
    MarkNotificationReadAPIView,
    MarkAllNotificationsReadAPIView,
)

urlpatterns = [
    path(
        "",
        NotificationListAPIView.as_view(),
        name="notification-list",
    ),
    path(
        "<int:pk>/read/",
        MarkNotificationReadAPIView.as_view(),
        name="notification-read",
    ),
    path(
        "read-all/",
        MarkAllNotificationsReadAPIView.as_view(),
        name="notifications-read-all",
    ),
]