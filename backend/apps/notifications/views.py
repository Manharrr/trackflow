from django.shortcuts import render
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django_tenants.utils import schema_context

from apps.tenants.utils import resolve_request_tenant
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = resolve_request_tenant(request)
        if not tenant:
            return Response(
                {
                    "count": 0,
                    "unread_count": 0,
                    "results": [],
                },
                status=status.HTTP_200_OK,
            )

        with schema_context(tenant.schema_name):
            notifications = (
                Notification.objects
                .filter(recipient=request.user, tenant=tenant)
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
        tenant = resolve_request_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with schema_context(tenant.schema_name):
            try:
                notification = Notification.objects.get(pk=pk, recipient=request.user, tenant=tenant)
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
        tenant = resolve_request_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with schema_context(tenant.schema_name):
            unread_notifications = Notification.objects.filter(
                recipient=request.user,
                tenant=tenant,
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