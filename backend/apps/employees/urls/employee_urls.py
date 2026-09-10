from django.urls import path

from apps.employees.views.employee_views import (
    EmployeeCreateAPIView,
    EmployeeListAPIView,
    EmployeeDetailAPIView,
    EmployeeUpdateAPIView,
    EmployeeDeleteAPIView,
    BlockEmployeeAPIView,
    UnblockEmployeeAPIView,
    ActivateEmployeeAPIView,
    DeactivateEmployeeAPIView,
    EmployeeProfileAPIView,
    EmployeeDashboardAPIView,
)

urlpatterns = [
    path("", EmployeeListAPIView.as_view(), name="employee-list"),
    path("create/", EmployeeCreateAPIView.as_view(), name="employee-create"),
    path("dashboard/", EmployeeDashboardAPIView.as_view(), name="employee-dashboard"),
    path("profile/", EmployeeProfileAPIView.as_view(), name="employee-profile"),
    path("<uuid:employee_id>/", EmployeeDetailAPIView.as_view(), name="employee-detail"),
    path("<uuid:employee_id>/update/", EmployeeUpdateAPIView.as_view(), name="employee-update"),
    path("<uuid:employee_id>/delete/", EmployeeDeleteAPIView.as_view(), name="employee-delete"),
    path("<uuid:employee_id>/block/", BlockEmployeeAPIView.as_view(), name="employee-block"),
    path("<uuid:employee_id>/unblock/", UnblockEmployeeAPIView.as_view(), name="employee-unblock"),
    path("<uuid:employee_id>/activate/", ActivateEmployeeAPIView.as_view(), name="employee-activate"),
    path("<uuid:employee_id>/deactivate/", DeactivateEmployeeAPIView.as_view(), name="employee-deactivate"),
]