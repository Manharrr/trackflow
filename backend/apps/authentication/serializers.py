from rest_framework import serializers

from apps.accounts.models import User
from apps.tenants.models import Client
from apps.authentication.services import normalize_phone_number, find_user_by_phone


class CompanyRegisterSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=100)
    workspace_code = serializers.CharField(max_length=50)
    admin_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=25)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("A valid phone number is required.")
        return normalized

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        workspace_clean = attrs["workspace_code"].strip().lower()
        if Client.objects.filter(schema_name=workspace_clean).exists():
            raise serializers.ValidationError(
                {"workspace_code": "Workspace already exists."}
            )

        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError(
                {"email": "Email already registered."}
            )

        phone = attrs["phone"]
        if find_user_by_phone(phone) is not None or User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError(
                {"phone": "Phone number already registered."}
            )

        # Normalize workspace code
        attrs["workspace_code"] = workspace_clean
        return attrs


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=25)
    otp = serializers.CharField(max_length=6)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        return normalized or value


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=25)
    password = serializers.CharField(write_only=True)
    workspace_code = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True, default="")

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        return normalized or value


class GoogleLoginSerializer(serializers.Serializer):
    token = serializers.CharField()
    workspace_code = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True, default="")


class CompleteCompanySetupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    company_name = serializers.CharField(max_length=100)
    workspace_code = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=25)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("A valid phone number is required.")
        return normalized

    def validate(self, attrs):
        workspace_clean = attrs["workspace_code"].strip().lower()
        if Client.objects.filter(schema_name=workspace_clean).exists():
            raise serializers.ValidationError(
                {"workspace_code": "Workspace already exists."}
            )

        # Ensure phone doesn't belong to another user
        phone = attrs["phone"]
        existing_user = find_user_by_phone(phone)
        if (existing_user and existing_user.email != attrs["email"]) or (
            User.objects.filter(phone=phone).exclude(email=attrs["email"]).exists()
        ):
            raise serializers.ValidationError(
                {"phone": "Phone number is already associated with another account."}
            )

        attrs["workspace_code"] = workspace_clean
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=25)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        return normalized or value


class VerifyForgotOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=25)
    otp = serializers.CharField(max_length=6)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        return normalized or value


class ResetPasswordSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=25)
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_phone(self, value):
        normalized = normalize_phone_number(value)
        return normalized or value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class MFAVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)


class MFALoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    workspace_code = serializers.CharField(max_length=50, required=False, allow_blank=True,allow_null=True, default="")
