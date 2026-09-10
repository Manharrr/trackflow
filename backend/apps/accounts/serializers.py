from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):

    class Meta:

        model = User

        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "phone_verified",
            "is_mfa_enabled",
        ]


class UserListSerializer(serializers.ModelSerializer):

    class Meta:

        model = User

        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
        ]