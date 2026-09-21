from rest_framework.permissions import BasePermission
from django_tenants.utils import schema_context

from apps.employees.models.employee import Employee, Role
from apps.tenants.models import Client
from apps.tenants.utils import resolve_request_tenant


class IsCompanyAdmin(BasePermission):
    """
    Allows access only to Company Admin users in the active tenant workspace.
    """

    message = "Only Company Admin can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if (
            not tenant
            or not isinstance(tenant, Client)
        ):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            return Employee.objects.filter(
                user=request.user,
                role=Role.COMPANY_ADMIN,
                tenant=tenant,
                is_active=True,
                is_blocked=False,
            ).exists()


class IsOperationsManager(BasePermission):
    """
    Allows access only to Operations Manager users in the active tenant workspace.
    """

    message = "Only Operations Manager can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if (
            not tenant
            or not isinstance(tenant, Client)
        ):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            return Employee.objects.filter(
                user=request.user,
                role=Role.OPERATIONS_MANAGER,
                tenant=tenant,
                is_active=True,
                is_blocked=False,
            ).exists()


class IsEmployee(BasePermission):
    """
    Allows access only to Employees in the active tenant workspace.
    """

    message = "Only Employees can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if (
            not tenant
            or not isinstance(tenant, Client)
        ):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            return Employee.objects.filter(
                user=request.user,
                role=Role.EMPLOYEE,
                tenant=tenant,
                is_active=True,
                is_blocked=False,
            ).exists()


class IsCompanyAdminOrOperationsManager(BasePermission):
    """
    Allows access to Company Admin and Operations Manager.
    """

    message = "You don't have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if (
            not tenant
            or not isinstance(tenant, Client)
        ):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            return Employee.objects.filter(
                user=request.user,
                tenant=tenant,
                role__in=[
                    Role.COMPANY_ADMIN,
                    Role.OPERATIONS_MANAGER,
                ],
                is_active=True,
                is_blocked=False,
            ).exists()


class IsTenantEmployee(BasePermission):
    """
    Allows access only to users who are registered employees in the current tenant.
    """

    message = "Access denied. You do not belong to this workspace."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None) or resolve_request_tenant(request)
        if (
            not tenant
            or not isinstance(tenant, Client)
        ):
            return False

        request.tenant = tenant

        if request.user.is_superuser:
            return True

        with schema_context(tenant.schema_name):
            return Employee.objects.filter(
                user=request.user,
                tenant=tenant,
                is_active=True,
                is_blocked=False,
            ).exists()