from django.conf import settings
from django.core.mail import send_mail
from apps.authentication.services import build_workspace_url


class EmailService:

    @staticmethod
    def send_activation_email(
        *,
        tenant,
        user,
        activation,
        domain=None,
    ):
        """
        Sends account activation email.
        """
        workspace_url = build_workspace_url(tenant, domain=domain)
        if not workspace_url:
            base_domain = getattr(settings, "BASE_DOMAIN", "manhargurukkal.site") or "manhargurukkal.site"
            host_name = f"{tenant.schema_name}.{base_domain}".strip().lower()
            if host_name.endswith(".localhost") or base_domain in ("localhost", "127.0.0.1"):
                workspace_url = f"http://{host_name}:5173"
            else:
                workspace_url = f"https://{host_name}"

        activation_url = (
            f"{workspace_url.rstrip('/')}/"
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