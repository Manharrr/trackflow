from django.conf import settings

from django.core.mail import send_mail


def send_company_approved_email(
    company
):
    send_mail(
        subject="Workspace Approved",

        message=f"""
Hello,

Your TrackFlow AI workspace has been approved.

Workspace

http://{company.schema_name}.{settings.BASE_DOMAIN}:5173
You can now login.

Regards

TrackFlow AI
""",

        from_email=settings.DEFAULT_FROM_EMAIL,

        recipient_list=[
            company.email
        ],

        fail_silently=True,
    )


def send_company_rejected_email(
    company,
    reason,
):
    send_mail(
        subject="Workspace Rejected",

        message=f"""
Hello,

Your workspace request has been rejected.

Reason

{reason}

Regards

TrackFlow AI
""",

        from_email=settings.DEFAULT_FROM_EMAIL,

        recipient_list=[
            company.email
        ],

        fail_silently=True,
    )