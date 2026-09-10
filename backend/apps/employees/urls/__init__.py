from django.urls import include, path

urlpatterns = [
    path("", include("apps.employees.urls.employee_urls")),
    path("", include("apps.employees.urls.activation_urls")),
]