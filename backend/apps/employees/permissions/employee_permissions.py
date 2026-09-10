from rest_framework.permissions import BasePermission
from apps.employees.models.employee import Employee, Role


class IsCompanyAdmin(BasePermission):
    """
    Allows access only to Company Admin users in the active tenant workspace.
    """

    message = "Only Company Admin can perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request, "tenant"):
            return False

        if request.user.is_superuser:
            return True

        return Employee.objects.filter(
            user=request.user,
            role=Role.COMPANY_ADMIN,
            tenant=request.tenant,
        ).exists()


class IsOperationsManager(BasePermission):
    """
    Allows access only to Operations Manager users in the active tenant workspace.
    """

    message = "Only Operations Manager can perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request, "tenant"):
            return False

        if request.user.is_superuser:
            return True

        return Employee.objects.filter(
            user=request.user,
            role=Role.OPERATIONS_MANAGER,
            tenant=request.tenant,
        ).exists()


class IsEmployee(BasePermission):
    """
    Allows access only to Employees in the active tenant workspace.
    """

    message = "Only Employees can perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request, "tenant"):
            return False

        return Employee.objects.filter(
            user=request.user,
            role=Role.EMPLOYEE,
            tenant=request.tenant,
        ).exists()


class IsCompanyAdminOrOperationsManager(BasePermission):
    """
    Allows access to Company Admin and Operations Manager.
    """

    message = "You don't have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request, "tenant"):
            return False

        if request.user.is_superuser:
            return True

        return Employee.objects.filter(
            user=request.user,
            tenant=request.tenant,
            role__in=[
                Role.COMPANY_ADMIN,
                Role.OPERATIONS_MANAGER,
            ],
        ).exists()


class IsTenantEmployee(BasePermission):
    """
    Allows access only to users who are registered employees in the current tenant.
    """

    message = "Access denied. You do not belong to this workspace."

    def has_permission(self, request, view):
        if not request.user.is_authenticated or not hasattr(request, "tenant"):
            return False

        if request.user.is_superuser:
            return True

        return Employee.objects.filter(
            user=request.user,
            tenant=request.tenant,
        ).exists()