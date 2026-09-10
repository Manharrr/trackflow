from django.conf import settings
from django.core.mail import send_mail


class EmailService:

    @staticmethod
    def send_activation_email(
        *,
        tenant,
        user,
        activation,
    ):
        """
        Sends account activation email.
        """

        activation_url = (
            f"http://{tenant.schema_name}.localhost:5173/"
            f"activate-account/{activation.token}"
        )

        subject = "Welcome to TrackFlow AI"

        message = f"""
Hello {user.first_name or user.email},

Your employee account has been created successfully.

Please click the link below to activate your account and create your password.

{activation_url}

This activation link will expire in 48 hours.

If you did not expect this email, you can safely ignore it.

Regards,

TrackFlow AI Team
"""
 
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )