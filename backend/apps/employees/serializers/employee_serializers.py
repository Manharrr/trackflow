from rest_framework import serializers

from apps.employees.models import Employee, Role


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """
    Used by Company Admin while creating employees.
    """

    class Meta:
        model = Employee

        fields = (
            "full_name",
            "email",
            "phone",
            "role",
            "department",
            "designation",
            "manager",
            "address",
            "emergency_contact",
            "joined_at",
        )

    def validate_role(self, value):

        if value not in [
            Role.OPERATIONS_MANAGER,
            Role.EMPLOYEE,
        ]:
            raise serializers.ValidationError(
                "Only Operations Manager and Employee roles are allowed."
            )

        return value

    def validate(self, attrs):

        tenant = self.context["request"].tenant

        if Employee.objects.filter(
            tenant=tenant,
            email=attrs["email"],
        ).exists():
            raise serializers.ValidationError(
                {
                    "email":
                    "Employee with this email already exists."
                }
            )

        if Employee.objects.filter(
            tenant=tenant,
            phone=attrs["phone"],
        ).exists():
            raise serializers.ValidationError(
                {
                    "phone":
                    "Employee with this phone already exists."
                }
            )

        return attrs


class EmployeeListSerializer(serializers.ModelSerializer):

    manager_name = serializers.CharField(
        source="manager.full_name",
        read_only=True,
    )
    created_by_email = serializers.CharField(
        source="created_by.email",
        read_only=True,
    )
    active_orders = serializers.IntegerField(
        source="active_orders_count",
        read_only=True,
        default=0,
    )
    completed_today = serializers.IntegerField(
        source="completed_today_count",
        read_only=True,
        default=0,
    )
    availability = serializers.SerializerMethodField()

    class Meta:

        model = Employee

        fields = (
            "id",
            "employee_code",
            "full_name",
            "email",
            "phone",
            "role",
            "department",
            "designation",
            "manager_name",
            "created_by_email",
            "is_active",
            "is_blocked",
            "created_at",
            "active_orders",
            "completed_today",
            "availability",
        )

    def get_availability(self, obj):
        active_count = getattr(obj, "active_orders_count", 0)
        return "Busy" if active_count >= 5 else "Available"


class EmployeeDetailSerializer(serializers.ModelSerializer):

    manager_name = serializers.CharField(
        source="manager.full_name",
        read_only=True,
    )
    created_by_email = serializers.CharField(
        source="created_by.email",
        read_only=True,
    )

    class Meta:

        model = Employee

        fields = "__all__"


class EmployeeUpdateSerializer(serializers.ModelSerializer):

    class Meta:

        model = Employee

        fields = (
            "full_name",
            "phone",
            "department",
            "designation",
            "manager",
            "address",
            "emergency_contact",
            "profile_image",
            "joined_at",
        )

    def validate_phone(self, value):

        employee = self.instance

        exists = Employee.objects.filter(
            tenant=employee.tenant,
            phone=value,
        ).exclude(
            id=employee.id,
        ).exists()

        if exists:
            raise serializers.ValidationError(
                "Phone already exists."
            )

        return value