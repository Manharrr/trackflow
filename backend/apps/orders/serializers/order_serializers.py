from rest_framework import serializers
from apps.orders.models.order import Order, OrderStatus, OrderPriority
from apps.employees.models import Employee, Role


class OrderSerializer(serializers.ModelSerializer):
    assigned_employee_name = serializers.CharField(
        source="assigned_employee.full_name",
        read_only=True,
    )
    assigned_by_email = serializers.CharField(
        source="assigned_by.email",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user:
            # Determine if driver
            employee = Employee.objects.filter(user=request.user, tenant=request.tenant).first()
            user_role = getattr(request.user, "role", None)
            is_driver = (
                (employee and employee.role == Role.EMPLOYEE) or
                user_role == Role.EMPLOYEE
            )
            # Strip internal notes if driver
            if is_driver:
                rep.pop("internal_notes", None)
        return rep


class OrderCreateSerializer(serializers.ModelSerializer):
    expected_delivery_date = serializers.DateTimeField(required=True)
    assigned_employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Order
        fields = (
            "customer_name",
            "customer_phone",
            "customer_email",
            "pickup_address",
            "delivery_address",
            "priority",
            "expected_delivery_date",
            "internal_notes",
            "assigned_employee",
        )

    def validate_customer_phone(self, value):
        phone = value.strip()
        if not phone or len(phone) < 7:
            raise serializers.ValidationError("Valid customer phone number is required.")
        return phone

    def validate_expected_delivery_date(self, value):
        from django.utils import timezone
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if value < today:
            raise serializers.ValidationError("Expected delivery date cannot be before today.")
        return value

    def validate_assigned_employee(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if not request:
            return value
        tenant = request.tenant
        if value.tenant != tenant:
            raise serializers.ValidationError("Courier driver does not belong to your company workspace.")
        if value.role != Role.EMPLOYEE:
            raise serializers.ValidationError("Only users with the Delivery Partner role can be assigned to orders.")
        if not value.is_active or value.is_blocked:
            raise serializers.ValidationError("Cannot assign order to an inactive or blocked driver.")
        return value


class OrderAssignmentSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=True)

    def validate_employee_id(self, value):
        request = self.context.get("request")
        tenant = request.tenant
        
        employee = Employee.objects.filter(id=value, tenant=tenant).first()
        if not employee:
            raise serializers.ValidationError(
                "Selected employee not found in this company workspace."
            )
        
        if not employee.is_active or employee.is_blocked:
            raise serializers.ValidationError(
                "Cannot assign driver who is inactive or blocked."
            )
            
        return employee


class OrderReassignmentSerializer(serializers.Serializer):
    employee_id = serializers.UUIDField(required=True)
    reason = serializers.CharField(required=True, min_length=3)

    def validate_employee_id(self, value):
        request = self.context.get("request")
        tenant = request.tenant
        
        employee = Employee.objects.filter(id=value, tenant=tenant).first()
        if not employee:
            raise serializers.ValidationError(
                "Selected employee not found in this company workspace."
            )
        
        if not employee.is_active or employee.is_blocked:
            raise serializers.ValidationError(
                "Cannot assign driver who is inactive or blocked."
            )
            
        return employee


class OrderBulkAssignmentSerializer(serializers.Serializer):
    order_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    employee_id = serializers.UUIDField(required=True)

    def validate_employee_id(self, value):
        request = self.context.get("request")
        tenant = request.tenant
        
        employee = Employee.objects.filter(id=value, tenant=tenant).first()
        if not employee:
            raise serializers.ValidationError(
                "Selected employee not found in this company workspace."
            )
        
        if not employee.is_active or employee.is_blocked:
            raise serializers.ValidationError(
                "Cannot assign driver who is inactive or blocked."
            )
            
        return employee


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices, required=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class OrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)


class OrderFailedDeliverySerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class OrderDelaySerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")
