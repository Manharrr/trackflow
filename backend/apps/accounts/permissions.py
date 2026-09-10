from rest_framework.permissions import BasePermission

from .models import Role


class IsSuperAdmin(BasePermission):

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            request.user.is_authenticated
            and
            request.user.role == Role.SUPER_ADMIN
        )


class IsCompanyAdmin(BasePermission):

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            request.user.is_authenticated
            and
            request.user.role == Role.COMPANY_ADMIN
        )


class IsOperationsManager(BasePermission):

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            request.user.is_authenticated
            and
            request.user.role == Role.OPERATIONS_MANAGER
        )


class IsEmployee(BasePermission):

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            request.user.is_authenticated
            and
            request.user.role == Role.EMPLOYEE
        )