from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.employees.models import Role, Employee
from apps.orders.services.operations_dashboard_service import OperationsDashboardService


class IsOperationsManagerOrAdmin(permissions.BasePermission):
    """
    Authorization policy mapping Operations Managers and Company Admins only.
    Strictly forbids Delivery Partner roles (employee).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return False

        user_role = getattr(request.user, "role", None)
        # Check active schema Employee record
        employee = Employee.objects.filter(user=request.user, tenant=tenant).first()
        role = employee.role if employee else user_role
        
        return role in [Role.COMPANY_ADMIN, Role.OPERATIONS_MANAGER] or request.user.is_superuser


class OperationsDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = request.tenant
        data = OperationsDashboardService.get_dashboard_metrics(tenant)
        return Response(data)


class OperationsTeamOverviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = request.tenant
        data = OperationsDashboardService.get_team_overview(tenant)
        return Response(data)


class OperationsLeaderboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = request.tenant
        data = OperationsDashboardService.get_employee_performance_leaderboard(tenant)
        return Response(data)


class OperationsChartsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = request.tenant
        data = OperationsDashboardService.get_charts_data(tenant)
        return Response(data)


class OperationsAssignablePartnersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperationsManagerOrAdmin]

    def get(self, request):
        tenant = request.tenant
        data = OperationsDashboardService.get_assignable_partners(tenant)
        return Response(data)
