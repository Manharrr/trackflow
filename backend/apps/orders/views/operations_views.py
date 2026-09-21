from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_tenants.utils import schema_context
from apps.employees.models import Role, Employee
from apps.tenants.models import Client
from apps.tenants.utils import resolve_request_tenant
from apps.orders.services.operations_dashboard_service import OperationsDashboardService


def _get_operations_tenant(request):
    tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
    if not tenant or not isinstance(tenant, Client):
        return None
    request.tenant = tenant
    return tenant


class IsOperationsManagerOrAdmin(permissions.BasePermission):
    """
    Authorization policy mapping Operations Managers and Company Admins only.
    Strictly forbids Delivery Partner roles (employee).
    """
    message = "Only Company Admin or Operations Manager can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if not tenant or not isinstance(tenant, Client):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            employee = Employee.objects.filter(
                user=request.user,
                tenant=tenant,
                is_active=True,
                is_blocked=False,
            ).first()

            if not employee:
                return False

            return employee.role in [Role.COMPANY_ADMIN, Role.OPERATIONS_MANAGER]


class OperationsDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = _get_operations_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with schema_context(tenant.schema_name):
            data = OperationsDashboardService.get_dashboard_metrics(tenant)
            return Response(data)


class OperationsTeamOverviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = _get_operations_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with schema_context(tenant.schema_name):
            data = OperationsDashboardService.get_team_overview(tenant)
            return Response(data)


class OperationsLeaderboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = _get_operations_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with schema_context(tenant.schema_name):
            data = OperationsDashboardService.get_employee_performance_leaderboard(tenant)
            return Response(data)


class OperationsChartsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = _get_operations_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with schema_context(tenant.schema_name):
            data = OperationsDashboardService.get_charts_data(tenant)
            return Response(data)


class OperationsAssignablePartnersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = _get_operations_tenant(request)
        if not tenant:
            return Response(
                {"detail": "Tenant context could not be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with schema_context(tenant.schema_name):
            data = OperationsDashboardService.get_assignable_partners(tenant)
            return Response(data)

