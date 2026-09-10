from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.utils import timezone
from datetime import datetime

from apps.employees.models.employee import Employee, Role
from apps.employees.serializers.employee_serializers import (
    EmployeeCreateSerializer,
    EmployeeListSerializer,
    EmployeeDetailSerializer,
    EmployeeUpdateSerializer,
)

from apps.employees.services.onboarding_service import EmployeeOnboardingService
from apps.employees.services.employee_service import EmployeeService
from apps.employees.permissions.employee_permissions import (
    IsCompanyAdmin,
    IsCompanyAdminOrOperationsManager,
    IsTenantEmployee,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmployeeCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def post(self, request):
        serializer = EmployeeCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        employee = EmployeeOnboardingService.create_employee(
            tenant=request.tenant,
            created_by=request.user,
            **serializer.validated_data
        )

        return Response(
            {
                "message": "Employee created successfully.",
                "data": EmployeeDetailSerializer(employee).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EmployeeListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdminOrOperationsManager]

    def get(self, request):
        from django.db.models import Count
        from datetime import timedelta
        from apps.orders.models.order import OrderStatus
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        active_statuses = [
            OrderStatus.ASSIGNED,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.FAILED,
        ]

        queryset = EmployeeService.list_employees(request.tenant).annotate(
            active_orders_count=Count(
                "assigned_orders",
                filter=Q(assigned_orders__status__in=active_statuses, assigned_orders__is_deleted=False),
            ),
            completed_today_count=Count(
                "assigned_orders",
                filter=Q(
                    assigned_orders__status=OrderStatus.DELIVERED,
                    assigned_orders__actual_delivery_date__range=(today_start, today_end),
                    assigned_orders__is_deleted=False,
                ),
            ),
        )

        # Search Query Filter
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(full_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(employee_code__icontains=search_query) |
                Q(designation__icontains=search_query)
            )

        # Role Filter
        role_filter = request.query_params.get("role", "").strip()
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        # Status Filter
        is_active_filter = request.query_params.get("is_active", "").strip()
        if is_active_filter:
            is_active_bool = is_active_filter.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)

        # Pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = EmployeeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = EmployeeListSerializer(queryset, many=True)
        return Response(serializer.data)


class EmployeeDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTenantEmployee]

    def get(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )

        # Allow if the user is a Company Admin, Operations Manager, or viewing their own profile
        is_self = employee.user == request.user
        has_privileged_role = Employee.objects.filter(
            user=request.user,
            tenant=request.tenant,
            role__in=[Role.COMPANY_ADMIN, Role.OPERATIONS_MANAGER]
        ).exists() or request.user.is_superuser

        if not is_self and not has_privileged_role:
            return Response(
                {"detail": "You do not have permission to view this employee profile."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = EmployeeDetailSerializer(employee)

        return Response(serializer.data)


class EmployeeUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTenantEmployee]

    def patch(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )

        # Allow updates if the user is a Company Admin or updating their own profile
        is_self = employee.user == request.user
        is_admin = Employee.objects.filter(
            user=request.user,
            tenant=request.tenant,
            role=Role.COMPANY_ADMIN
        ).exists() or request.user.is_superuser

        if not is_self and not is_admin:
            return Response(
                {"detail": "Permission denied. You can only update your own profile or must be a Company Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmployeeUpdateSerializer(
            employee,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)

        employee = EmployeeService.update_employee(
            employee,
            serializer.validated_data,
        )

        return Response(
            {
                "message": "Employee updated successfully.",
                "data": EmployeeDetailSerializer(employee).data,
            }
        )


class EmployeeDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def delete(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )

        EmployeeService.delete_employee(employee)

        return Response(
            {
                "message": "Employee deleted successfully."
            },
            status=status.HTTP_204_NO_CONTENT,
        )


class BlockEmployeeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def post(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )

        EmployeeService.block_employee(employee)

        return Response(
            {
                "message": "Employee blocked successfully."
            }
        )


class UnblockEmployeeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def post(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )

        EmployeeService.unblock_employee(employee)

        return Response(
            {
                "message": "Employee unblocked successfully."
            }
        )


class ActivateEmployeeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdminOrOperationsManager]

    def post(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )
        # Check permissions for Operations Manager
        operator = Employee.objects.filter(user=request.user, tenant=request.tenant).first()
        if operator and operator.role == Role.OPERATIONS_MANAGER:
            if employee.role != Role.EMPLOYEE:
                return Response(
                    {"detail": "Operations Managers can only toggle status of Delivery Partners."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        EmployeeService.activate_employee(employee)
        return Response(
            {
                "message": "Employee activated successfully."
            },
            status=status.HTTP_200_OK,
        )


class DeactivateEmployeeAPIView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdminOrOperationsManager]

    def post(self, request, employee_id):
        employee = EmployeeService.get_employee(
            employee_id=employee_id,
            tenant=request.tenant,
        )
        # Check permissions for Operations Manager
        operator = Employee.objects.filter(user=request.user, tenant=request.tenant).first()
        if operator and operator.role == Role.OPERATIONS_MANAGER:
            if employee.role != Role.EMPLOYEE:
                return Response(
                    {"detail": "Operations Managers can only toggle status of Delivery Partners."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        EmployeeService.deactivate_employee(employee)
        return Response(
            {
                "message": "Employee deactivated successfully."
            },
            status=status.HTTP_200_OK,
        )


class EmployeeProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = Employee.objects.filter(
            user=request.user,
            tenant=request.tenant
        ).first()

        if not employee:
            return Response(
                {"detail": "Employee profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = EmployeeDetailSerializer(employee)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        employee = Employee.objects.filter(
            user=request.user,
            tenant=request.tenant
        ).first()

        if not employee:
            return Response(
                {"detail": "Employee profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = EmployeeUpdateSerializer(
            employee,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        employee = EmployeeService.update_employee(employee, serializer.validated_data)

        return Response(
            {
                "message": "Profile updated successfully.",
                "data": EmployeeDetailSerializer(employee).data
            },
            status=status.HTTP_200_OK
        )


class EmployeeDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = Employee.objects.filter(
            user=request.user,
            tenant=request.tenant
        ).first()

        employee_name = employee.full_name if employee else (request.user.first_name or "Employee")
        company_name = request.tenant.name if hasattr(request, "tenant") else "TrackFlow AI"
        current_date = timezone.now().strftime("%A, %B %d, %Y")

        # Dynamic profile completion calculation
        profile_completion = 0
        if employee:
            fields_to_check = [
                employee.full_name,
                employee.phone,
                employee.email,
                employee.profile_image,
                employee.department,
                employee.designation,
                employee.address,
                employee.emergency_contact,
                employee.joined_at,
            ]
            filled_count = sum(1 for field in fields_to_check if field)
            profile_completion = int((filled_count / len(fields_to_check)) * 100)

        # Dynamic order statistics
        assigned_orders_count = 0
        completed_orders_count = 0
        pending_orders_count = 0

        if employee:
            from apps.orders.models import Order, OrderStatus
            assigned_orders_count = Order.objects.filter(assigned_employee=employee).count()
            completed_orders_count = Order.objects.filter(
                assigned_employee=employee, 
                status=OrderStatus.DELIVERED
            ).count()
            pending_orders_count = Order.objects.filter(assigned_employee=employee).exclude(
                status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED]
            ).count()

        recent_activities = [
            {
                "id": 1,
                "description": "Account activated and setup successfully.",
                "timestamp": "1 day ago"
            },
            {
                "id": 2,
                "description": "Verified primary phone contact info.",
                "timestamp": "2 days ago"
            },
            {
                "id": 3,
                "description": "Onboarded as Delivery Executive.",
                "timestamp": "3 days ago"
            }
        ]

        return Response(
            {
                "employee_name": employee_name,
                "company_name": company_name,
                "current_date": current_date,
                "assigned_orders": assigned_orders_count,
                "completed_orders": completed_orders_count,
                "pending_orders": pending_orders_count,
                "profile_completion": profile_completion,
                "recent_activity": recent_activities,
            },
            status=status.HTTP_200_OK
        )