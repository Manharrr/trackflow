from rest_framework import serializers


class ForgotPasswordSerializer(
    serializers.Serializer
):

    phone = serializers.CharField(
        max_length=15,
    )


class VerifyResetOTPSerializer(
    serializers.Serializer
):

    phone = serializers.CharField(
        max_length=15,
    )

    otp = serializers.CharField(
        max_length=6,
    )


class ResetPasswordSerializer(
    serializers.Serializer
):

    phone = serializers.CharField(
        max_length=15,
    )

    otp = serializers.CharField(
        max_length=6,
    )

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    def validate(
        self,
        attrs,
    ):

        if (
            attrs["password"]
            !=
            attrs["confirm_password"]
        ):

            raise serializers.ValidationError(
                {
                    "confirm_password":
                    "Passwords do not match."
                }
            )

        return attrs