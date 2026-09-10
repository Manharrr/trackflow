from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from apps.tenants.models import UserTenant
from apps.employees.models import Employee

User = get_user_model()


class EmployeeService:

    @staticmethod
    @transaction.atomic
    def create_employee(
        *,
        tenant,
        full_name,
        email,
        phone,
        role,
        department="",
        designation="",
        manager=None,
        address="",
        emergency_contact="",
        joined_at=None,
        created_by=None,
    ):
        """
        Creates

        1. User
        2. UserTenant
        3. Employee
        """

        
        # Email already registered
        if User.objects.filter(email=email).exists():
            raise ValidationError(
                {
                    "email": "Email already registered."
                }
            )

        
        # Phone already registered
        if User.objects.filter(phone=phone).exists():
            raise ValidationError(
                {
                    "phone": "Phone already registered."
                }
            )

       
        # Create User
       
        user = User.objects.create_user(
            username=email,
            email=email,
            phone=phone,
        )

        # Employee will set password later
        user.set_unusable_password()

        user.is_verified = False

        user.save()

        
        # Workspace Mapping
        
        UserTenant.objects.create(
            user=user,
            tenant=tenant,
            is_active=True,
        )

       
        # Employee Profile
        

        employee = Employee.objects.create(
            tenant=tenant,
            user=user,
            role=role,
            full_name=full_name,
            email=email,
            phone=phone,
            department=department,
            designation=designation,
            manager=manager,
            address=address,
            emergency_contact=emergency_contact,
            joined_at=joined_at,
            created_by=created_by,
            first_login=True,
            password_changed=False,
            is_active=True,
            is_blocked=False,
        )

        return employee

    @staticmethod
    def list_employees(tenant):

        return (
            Employee.objects
            .filter(
                tenant=tenant,
            )
            .select_related(
                "user",
                "manager",
            )
            .order_by("-created_at")
        )

    @staticmethod
    def get_employee(employee_id, tenant):

        try:

            return (
                Employee.objects
                .select_related(
                    "user",
                    "manager",
                )
                .get(
                    id=employee_id,
                    tenant=tenant,
                )
            )

        except Employee.DoesNotExist:

            raise ValidationError(
                {
                    "employee": "Employee not found."
                }
            )

    @staticmethod
    @transaction.atomic
    def update_employee(
        employee,
        validated_data,
    ):

        for field, value in validated_data.items():
            setattr(employee, field, value)

        employee.save()

        return employee

    @staticmethod
    @transaction.atomic
    def block_employee(employee):

        if employee.is_blocked:
            raise ValidationError(
                {
                    "employee": "Employee already blocked."
                }
            )

        employee.is_blocked = True
        employee.is_active = False

        employee.save(
            update_fields=[
                "is_blocked",
                "is_active",
            ]
        )

        return employee

    @staticmethod
    @transaction.atomic
    def unblock_employee(employee):

        if not employee.is_blocked:
            raise ValidationError(
                {
                    "employee": "Employee already active."
                }
            )

        employee.is_blocked = False
        employee.is_active = True

        employee.save(
            update_fields=[
                "is_blocked",
                "is_active",
            ]
        )

        return employee

    @staticmethod
    @transaction.atomic
    def delete_employee(employee):

        UserTenant.objects.filter(
            tenant=employee.tenant,
            user=employee.user,
        ).delete()

        employee.user.delete()

        employee.delete()

        return True

    @staticmethod
    @transaction.atomic
    def activate_employee(employee):
        if employee.is_active:
            raise ValidationError(
                {
                    "employee": "Employee is already active."
                }
            )

        employee.is_active = True
        employee.is_blocked = False

        employee.save(
            update_fields=[
                "is_active",
                "is_blocked",
            ]
        )

        return employee

    @staticmethod
    @transaction.atomic
    def deactivate_employee(employee):
        if not employee.is_active:
            raise ValidationError(
                {
                    "employee": "Employee is already inactive."
                }
            )

        employee.is_active = False
        employee.is_blocked = True

        employee.save(
            update_fields=[
                "is_active",
                "is_blocked",
            ]
        )

        return employee