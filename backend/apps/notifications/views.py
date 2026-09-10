from django.shortcuts import render
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = (
            Notification.objects
            .filter(recipient=request.user)
            .order_by("-created_at")
        )

        serializer = NotificationSerializer(
            notifications,
            many=True,
        )

        unread_count = notifications.filter(is_read=False).count()

        return Response(
            {
                "count": notifications.count(),
                "unread_count": unread_count,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MarkAllNotificationsReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        unread_notifications = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        )
        count = unread_notifications.update(
            is_read=True,
            read_at=timezone.now()
        )

        return Response(
            {"message": f"Successfully marked {count} notifications as read."},
            status=status.HTTP_200_OK
        )