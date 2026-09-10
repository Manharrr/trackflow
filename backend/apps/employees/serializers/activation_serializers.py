from rest_framework import serializers


class ActivationTokenSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class SetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    confirm_password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs