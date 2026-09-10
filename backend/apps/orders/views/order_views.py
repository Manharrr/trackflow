from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Case, When, Value, IntegerField
from django.utils.dateparse import parse_datetime

from apps.orders.models.order import Order, OrderStatus, OrderPriority
from apps.employees.models import Employee, Role
from apps.orders.serializers.order_serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    OrderAssignmentSerializer,
    OrderReassignmentSerializer,
    OrderBulkAssignmentSerializer,
    OrderStatusUpdateSerializer,
    OrderCancelSerializer,
    OrderFailedDeliverySerializer,
    OrderDelaySerializer,
)
from apps.orders.services.order_service import OrderService
from apps.orders.services.assignment_service import AssignmentService
from apps.orders.services.status_service import StatusService
from apps.orders.services.timeline_service import TimelineService
from apps.orders.services.dashboard_service import DashboardService


class StandardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class OrderListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        user = request.user

        # Fetch orders inside tenant context
        queryset = Order.objects.filter(company=tenant, is_deleted=False).select_related(
            "assigned_employee", "assigned_by"
        )

        # Scoping: Delivery Partners only see assigned orders
        employee = Employee.objects.filter(user=user, tenant=tenant).first()
        is_driver = (
            (employee and employee.role == Role.EMPLOYEE) or
            getattr(user, "role", None) == Role.EMPLOYEE
        )

        if is_driver:
            queryset = queryset.filter(assigned_employee=employee)

        # Search Query: Tracking ID, Customer Name, Phone
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(tracking_id__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search)
            )

        # Filters
        status_filter = request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority_filter = request.query_params.get("priority", "").strip()
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        assigned_filter = request.query_params.get("assigned_employee", "").strip()
        if assigned_filter:
            queryset = queryset.filter(assigned_employee_id=assigned_filter)

        creator_filter = request.query_params.get("created_by", "").strip()
        if creator_filter:
            queryset = queryset.filter(assigned_by_id=creator_filter)

        # Expected Delivery range filter
        delivery_start = request.query_params.get("expected_delivery_start", "").strip()
        delivery_end = request.query_params.get("expected_delivery_end", "").strip()
        if delivery_start:
            dt_start = parse_datetime(delivery_start)
            if dt_start:
                queryset = queryset.filter(expected_delivery_date__gte=dt_start)
        if delivery_end:
            dt_end = parse_datetime(delivery_end)
            if dt_end:
                queryset = queryset.filter(expected_delivery_date__lte=dt_end)

        # Sorting
        sort = request.query_params.get("sort", "newest").strip()
        if sort == "oldest":
            queryset = queryset.order_by("created_at")
        elif sort == "expected_delivery":
            queryset = queryset.order_by("expected_delivery_date")
        elif sort == "priority":
            # Priority weight ordering: Urgent=1, High=2, Medium=3, Low=4
            queryset = queryset.annotate(
                priority_weight=Case(
                    When(priority=OrderPriority.URGENT, then=Value(1)),
                    When(priority=OrderPriority.HIGH, then=Value(2)),
                    When(priority=OrderPriority.MEDIUM, then=Value(3)),
                    When(priority=OrderPriority.LOW, then=Value(4)),
                    default=Value(5),
                    output_field=IntegerField(),
                )
            ).order_by("priority_weight", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        # Paginate results
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = OrderSerializer(page, many=True, context={"request": request})
            return paginator.get_paginated_response(serializer.data)

        serializer = OrderSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class OrderCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = OrderService.create_order(
            tenant=request.tenant,
            OM_user=request.user,
            data=serializer.validated_data,
        )
        
        try:
            from apps.orders.task import notify_order_created
            notify_order_created.delay(request.tenant.schema_name, order.id)
        except Exception as err:
            logger.exception(
                f"[Celery Publish Error] Failed to publish notify_order_created task. "
                f"Schema: {request.tenant.schema_name} | OrderID: {order.id} | Error: {str(err)}"
            )

        return Response(
            {
                "message": "Order created successfully.",
                "data": OrderSerializer(order, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_order(self, request, order_id):
        tenant = request.tenant
        try:
            return Order.objects.get(id=order_id, company=tenant)
        except Order.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Order not found.")

    def get(self, request, order_id):
        order = self._get_order(request, order_id)
        # Exclude details if soft deleted
        if order.is_deleted:
            return Response({"detail": "This order is deleted."}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = OrderSerializer(order, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, order_id):
        order = self._get_order(request, order_id)
        serializer = OrderCreateSerializer(order, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        updated_order = OrderService.update_order(
            order=order,
            data=serializer.validated_data,
            changed_by=request.user,
        )
        return Response(
            {
                "message": "Order details updated successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )

    def delete(self, request, order_id):
        order = self._get_order(request, order_id)
        OrderService.soft_delete_order(order=order, user=request.user)
        return Response({"message": "Order deleted successfully."}, status=status.HTTP_200_OK)


class OrderRestoreAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        restored_order = OrderService.restore_order(order=order, user=request.user)
        return Response(
            {
                "message": "Order restored successfully.",
                "data": OrderSerializer(restored_order, context={"request": request}).data,
            }
        )


class OrderAssignAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant, is_deleted=False)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        # Decide whether initial assignment or reassignment
        if order.assigned_employee:
            serializer = OrderReassignmentSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            updated_order = AssignmentService.reassign_order(
                order=order,
                new_employee=serializer.validated_data["employee_id"],
                assigned_by=request.user,
                reason=serializer.validated_data["reason"],
            )
        else:
            serializer = OrderAssignmentSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            updated_order = AssignmentService.assign_order(
                order=order,
                employee=serializer.validated_data["employee_id"],
                assigned_by=request.user,
            )

        return Response(
            {
                "message": "Courier assigned successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )


class OrderBulkAssignAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = OrderBulkAssignmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        assigned_orders = AssignmentService.bulk_assign_orders(
            order_ids=serializer.validated_data["order_ids"],
            employee=serializer.validated_data["employee_id"],
            assigned_by=request.user,
            tenant=request.tenant,
        )

        return Response(
            {
                "message": f"Successfully batch-assigned {len(assigned_orders)} orders.",
                "data": OrderSerializer(assigned_orders, many=True, context={"request": request}).data,
            }
        )


class OrderStatusUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant, is_deleted=False)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_order = StatusService.update_status(
            order=order,
            new_status=serializer.validated_data["status"],
            user=request.user,
            remarks=serializer.validated_data["remarks"],
        )

        return Response(
            {
                "message": "Status updated successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )


class OrderCancelAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant, is_deleted=False)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_order = StatusService.cancel_order(
            order=order,
            user=request.user,
            reason=serializer.validated_data["reason"],
        )

        return Response(
            {
                "message": "Order cancelled successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )


class OrderFailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant, is_deleted=False)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderFailedDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_order = StatusService.fail_delivery(
            order=order,
            user=request.user,
            reason=serializer.validated_data["reason"],
            remarks=serializer.validated_data["remarks"],
        )

        return Response(
            {
                "message": "Delivery failure logged successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )


class OrderDelayAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant, is_deleted=False)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderDelaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_order = StatusService.mark_delayed(
            order=order,
            user=request.user,
            reason=serializer.validated_data["reason"],
            remarks=serializer.validated_data["remarks"],
        )

        return Response(
            {
                "message": "Delay logged successfully.",
                "data": OrderSerializer(updated_order, context={"request": request}).data,
            }
        )


class OrderTimelineAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        tenant = request.tenant
        try:
            order = Order.objects.get(id=order_id, company=tenant)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        timeline = TimelineService.get_timeline(order)
        return Response(timeline)


class OrderDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant = request.tenant
        metrics = DashboardService.get_dashboard_metrics(request.user, tenant)
        return Response(metrics)
