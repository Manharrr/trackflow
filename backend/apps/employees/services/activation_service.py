from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.employees.models import AccountActivation


class ActivationService:

    @staticmethod
    @transaction.atomic
    def create_activation(user):
        """
        Creates a new activation token.

        If an unused activation already exists,
        replace it with a fresh one.
        """

        AccountActivation.objects.filter(
            user=user,
            is_used=False,
        ).delete()

        activation = AccountActivation.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(days=2),
        )

        return activation

    @staticmethod
    def verify_token(token):
        """
        Validate activation token.
        """

        try:

            activation = AccountActivation.objects.select_related(
                "user",
            ).get(
                token=token,
                is_used=False,
            )

        except AccountActivation.DoesNotExist:

            raise ValidationError(
                {
                    "token": "Invalid activation token."
                }
            )

        if timezone.now() > activation.expires_at:

            raise ValidationError(
                {
                    "token": "Activation link expired."
                }
            )

        return activation

    @staticmethod
    @transaction.atomic
    def activate_account(
        token,
        password,
    ):
        """
        Employee sets password
        and activates account.
        """

        activation = ActivationService.verify_token(
            token,
        )

        user = activation.user

        user.set_password(password)

        user.is_verified = True

        user.save()

        activation.is_used = True

        activation.save(
            update_fields=[
                "is_used",
            ]
        )

        return user