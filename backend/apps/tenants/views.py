import stripe
from urllib.parse import urlsplit
from django.conf import settings
from django.utils import timezone

from django.db import transaction
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Client, Domain, UserTenant,Subscription,Payment
from .serializers import CompanySerializer
from .services import (
    send_company_approved_email,
    send_company_rejected_email,
)

from .service.subscription_services import create_pending_subscription
from .service.stripe_service import create_stripe_checkout_session

class CompanyListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        companies = Client.objects.exclude(schema_name="public")
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PendingCompanyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        companies = Client.objects.filter(status="pending")
        serializer = CompanySerializer(companies, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApproveCompanyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Client.objects.get(id=pk)
        except Client.DoesNotExist:
            return Response(
                {"message": "Company not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if company.status == "approved":
            return Response(
                {"message": "Company is already approved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        company.status = "approved"
        company.save()

        # Create pending subscription
        create_pending_subscription(company)

        # Create PostgreSQL schema
        company.create_schema(check_if_exists=True)
        
        from django.conf import settings
        # Create domain
        # domain_name = f"{company.schema_name}.trackflow.local"
        domain_name = (
            f"{company.schema_name}.{settings.BASE_DOMAIN}"
        )
        Domain.objects.get_or_create(
            domain=domain_name,
            tenant=company,
            defaults={"is_primary": True},
        )

        # Look up User and map Tenant / Admin Employee profiles
        from apps.accounts.models import User
        user = User.objects.filter(email=company.email).first()

        if user:
            # Create UserTenant relation
            UserTenant.objects.get_or_create(
                user=user,
                tenant=company,
                defaults={"is_active": True},
            )

            # Switch context to the company schema to create the Employee record inside it
            from django_tenants.utils import schema_context
            with schema_context(company.schema_name):
                from apps.employees.models.employee import Employee, Role
                Employee.objects.get_or_create(
                    tenant=company,
                    user=user,
                    defaults={
                        "role": Role.COMPANY_ADMIN,
                        "full_name": user.first_name or user.username or "Company Admin",
                        "email": user.email,
                        "phone": user.phone,
                        "is_active": True,
                        "is_blocked": False,
                    },
                )

        # Send approval notification email
        send_company_approved_email(company)

        return Response(
            {"message": "Company approved successfully and tenant resources created."},
            status=status.HTTP_200_OK,
        )


class RejectCompanyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            company = Client.objects.get(id=pk)
        except Client.DoesNotExist:
            return Response(
                {"message": "Company not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        reason = request.data.get("reason")
        if not reason:
            return Response(
                {"message": "Reason is required to reject a workspace request."},
                status=status.HTTP_400_BAD_REQUEST
            )

        company.status = "rejected"
        company.rejection_reason = reason
        company.save()

        # Send rejection notification email
        send_company_rejected_email(company, reason)

        return Response(
            {"message": "Company rejected successfully."},
            status=status.HTTP_200_OK,
        )


class CompanyDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            company = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response(
                {"error": "Company not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CompanySerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        try:
            company = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response(
                {"error": "Company not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Allow Super Admin or mapped UserTenant company admin to update details
        if not request.user.is_superuser:
            user_tenant_exists = UserTenant.objects.filter(user=request.user, tenant=company).exists()
            if not user_tenant_exists:
                return Response(
                    {"error": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )

        name = request.data.get("name")
        if name:
            company.name = name

        address = request.data.get("address")
        if address is not None:
            company.address = address

        description = request.data.get("description")
        if description is not None:
            company.description = description

        logo = request.FILES.get("logo")
        if logo:
            company.logo = logo

        company.save()
        serializer = CompanySerializer(company)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SuperAdminDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        total = Client.objects.exclude(schema_name="public").count()
        pending = Client.objects.filter(status="pending").count()
        approved = Client.objects.filter(status="approved").count()
        rejected = Client.objects.filter(status="rejected").count()

        recent = Client.objects.exclude(schema_name="public").order_by("-created_at")[:5]

        return Response(
            {
                "summary": {
                    "total": total,
                    "pending": pending,
                    "approved": approved,
                    "rejected": rejected,
                },
                "recent": CompanySerializer(recent, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


def _is_local_host(hostname: str) -> bool:
    if not hostname:
        return False
    host = hostname.split(":")[0].strip().lower()
    return (
        host in ("localhost", "127.0.0.1", "0.0.0.0")
        or host.endswith(".localhost")
    )


def get_tenant_payment_frontend_base(request, company) -> str:
    """
    Securely and dynamically resolves the frontend base URL for Stripe checkout redirects.

    Security & Validation:
    - Never blindly trusts request.data['origin'] or Origin headers.
    - Production:
        - Only allows origins matching the verified tenant domain: <tenant>.manhargurukkal.site.
        - Rejects arbitrary external origins (e.g., https://attacker.com).
        - Strips any development port (:5173) and enforces HTTPS.
    - Local development:
        - Allows localhost, 127.0.0.1, or <tenant>.localhost with port :5173.
    """
    # 1. Resolve verified tenant primary domain
    domain = None
    try:
        if company:
            domain = Domain.objects.filter(
                tenant=company,
                is_primary=True,
            ).first()
    except Exception:
        domain = None

    base_domain = getattr(settings, "BASE_DOMAIN", "manhargurukkal.site") or "manhargurukkal.site"
    if domain and domain.domain:
        verified_domain = domain.domain.strip().lower()
    elif company and hasattr(company, "schema_name"):
        verified_domain = f"{company.schema_name}.{base_domain}".strip().lower()
    else:
        verified_domain = base_domain.strip().lower()

    verified_host = verified_domain.split(":")[0]
    is_local = _is_local_host(verified_host) or (getattr(settings, "DEBUG", False) and _is_local_host(base_domain))

    # 2. Extract candidate origin from request (body, Origin header, Referer)
    candidate_origin = None
    if isinstance(getattr(request, "data", None), dict) and request.data.get("origin"):
        candidate_origin = str(request.data.get("origin")).strip()
    elif hasattr(request, "headers") and request.headers.get("origin"):
        candidate_origin = request.headers.get("origin").strip()
    elif hasattr(request, "META") and request.META.get("HTTP_ORIGIN"):
        candidate_origin = request.META.get("HTTP_ORIGIN").strip()
    elif hasattr(request, "headers") and request.headers.get("referer"):
        candidate_origin = request.headers.get("referer").strip()
    elif hasattr(request, "META") and request.META.get("HTTP_REFERER"):
        candidate_origin = request.META.get("HTTP_REFERER").strip()

    candidate_host = None
    candidate_port = None
    candidate_scheme = None

    if candidate_origin:
        try:
            parsed = urlsplit(candidate_origin)
            if parsed.hostname:
                candidate_host = parsed.hostname.strip().lower()
                candidate_port = parsed.port
                candidate_scheme = (parsed.scheme or "").strip().lower()
        except Exception:
            pass

    # 3. Validation:
    # A) Local development check:
    # Allow localhost / 127.0.0.1 / *.localhost origins with the Vite :5173 port
    if candidate_host and _is_local_host(candidate_host):
        port = candidate_port or 5173
        scheme = candidate_scheme if candidate_scheme in ("http", "https") else "http"
        return f"{scheme}://{candidate_host}:{port}"

    # B) Production check:
    # Only allow origins matching the verified tenant domain (<tenant>.manhargurukkal.site).
    # Reject arbitrary external origins like attacker.com.
    # Never append :5173 or dev port in production; enforce HTTPS.
    if candidate_host and candidate_host == verified_host:
        return f"https://{verified_host}"

    # C) Fallback when candidate origin is missing or untrusted (e.g. attacker.com):
    # Safely generate from verified tenant domain
    if _is_local_host(verified_host):
        return f"http://{verified_host}:5173"

    return f"https://{verified_host}"


class CreateCheckoutSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Company Admin must be authenticated
        user = request.user

        # Find the company mapped to this user
        user_tenant = (
            UserTenant.objects
            .filter(
                user=user,
                is_active=True,
            )
            .select_related("tenant")
            .first()
        )

        if not user_tenant:
            return Response(
                {"message": "Company not found for this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = user_tenant.tenant

        # Company must be approved
        if company.status != "approved":
            return Response(
                {
                    "message": "Company is not approved."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get subscription
        try:
            subscription = Subscription.objects.get(
                client=company
            )
        except Subscription.DoesNotExist:
            return Response(
                {
                    "message": "Subscription not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Already paid
        if subscription.status == "active":
            return Response(
                {
                    "message": "Subscription is already active."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create Stripe Checkout Session
        frontend_base = get_tenant_payment_frontend_base(request, company)
        success_url = f"{frontend_base}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{frontend_base}/payment/cancel"

        try:
            checkout_session = create_stripe_checkout_session(
                subscription=subscription,
                success_url=success_url,
                cancel_url=cancel_url,
            )

        except Exception as e:
            return Response(
                {
                    "message": "Unable to create Stripe checkout session.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Create local Payment record
        Payment.objects.create(
            client=company,
            subscription=subscription,
            amount=subscription.amount,
            status="created",
            stripe_checkout_session_id=checkout_session.id,
        )

        return Response(
            {
                "message": "Stripe checkout session created.",
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
            },
            status=status.HTTP_200_OK,
        )


class SubscriptionStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        user_tenant = (
            UserTenant.objects
            .filter(
                user=user,
                is_active=True,
            )
            .select_related("tenant")
            .first()
        )

        if not user_tenant:
            return Response(
                {"message": "Company not found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        company = user_tenant.tenant

        try:
            subscription = Subscription.objects.get(client=company)
        except Subscription.DoesNotExist:
            subscription = None

        if subscription and subscription.status != "active":
            session_id = request.query_params.get("session_id")
            payments = Payment.objects.filter(client=company).order_by("-created_at")
            if session_id:
                payments = payments.filter(stripe_checkout_session_id=session_id)

            stripe.api_key = settings.STRIPE_SECRET_KEY
            for pm in payments[:5]:
                if pm.stripe_checkout_session_id:
                    try:
                        sess = stripe.checkout.Session.retrieve(pm.stripe_checkout_session_id)
                        if sess.payment_status == "paid" or sess.status == "complete":
                            from django.utils import timezone
                            from datetime import timedelta

                            subscription.status = "active"
                            subscription.stripe_subscription_id = sess.subscription or subscription.stripe_subscription_id
                            subscription.stripe_customer_id = sess.customer or subscription.stripe_customer_id
                            if not subscription.started_at:
                                subscription.started_at = timezone.now()
                            if not subscription.expires_at:
                                subscription.expires_at = timezone.now() + timedelta(days=30)
                            subscription.save(update_fields=["status", "stripe_subscription_id", "stripe_customer_id", "started_at", "expires_at"])

                            pm.status = "succeeded"
                            pm.save(update_fields=["status"])
                            break
                    except Exception as e:
                        pass

        return Response(
            {
                "company_status": company.status,
                "subscription_status": subscription.status if subscription else "payment_pending",
                "amount": str(subscription.amount) if subscription else "1000.00",
                "billing_cycle": subscription.billing_cycle if subscription else "monthly",
                "started_at": subscription.started_at if subscription else None,
                "expires_at": subscription.expires_at if subscription else None,
                "tenant": {
                    "id": company.id,
                    "name": company.name,
                    "schema_name": company.schema_name,
                },
            },
            status=status.HTTP_200_OK,
        )


class StripeWebhookAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET,
            )

        except ValueError:
            return Response(
                {"message": "Invalid payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except stripe.error.SignatureVerificationError:
            return Response(
                {"message": "Invalid Stripe signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = event["type"]
        event_id = event["id"]

        # Idempotency: avoid processing the same Stripe event multiple times
        if event_id and Payment.objects.filter(stripe_event_id=event_id).exists():
            return Response(
                {"message": "Event already processed."},
                status=status.HTTP_200_OK,
            )

        # Checkout completed
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]

            subscription_id = session.get("metadata", {}).get(
                "subscription_id"
            )
            client_id = session.get("metadata", {}).get(
                "client_id"
            )

            if subscription_id and client_id:
                try:
                    subscription = Subscription.objects.get(
                        id=subscription_id,
                        client_id=client_id,
                    )

                    subscription.stripe_customer_id = (
                        session.get("customer")
                    )
                    subscription.stripe_subscription_id = (
                        session.get("subscription")
                    )
                    subscription.save(
                        update_fields=[
                            "stripe_customer_id",
                            "stripe_subscription_id",
                            "updated_at",
                        ]
                    )

                    payment = Payment.objects.filter(
                        stripe_checkout_session_id=session["id"]
                    ).first()

                    if payment and session.get("payment_intent"):
                        payment.stripe_payment_intent_id = session.get("payment_intent")
                        payment.save(
                            update_fields=[
                                "stripe_payment_intent_id",
                                "updated_at",
                            ]
                        )

                except Subscription.DoesNotExist:
                    pass

        # Payment successful
        elif event_type == "invoice.paid":
            invoice = event["data"]["object"]
            stripe_subscription_id = invoice.get(
                "subscription"
            )

            if stripe_subscription_id:
                try:
                    subscription = Subscription.objects.get(
                        stripe_subscription_id=stripe_subscription_id
                    )
                except Subscription.DoesNotExist:
                    subscription = Subscription.objects.filter(
                        stripe_customer_id=invoice.get("customer")
                    ).first()

                if subscription:
                    subscription.status = "active"
                    if not subscription.stripe_subscription_id:
                        subscription.stripe_subscription_id = stripe_subscription_id
                    if not subscription.started_at:
                        subscription.started_at = timezone.now()
                    subscription.save()

                    payment = Payment.objects.filter(
                        subscription=subscription,
                        status="created",
                    ).order_by("-created_at").first()

                    if payment:
                        payment.status = "success"
                        payment.stripe_invoice_id = invoice.get("id")
                        payment.paid_at = timezone.now()
                        payment.stripe_event_id = event_id
                        payment.save()
                    else:
                        amount_paid = (invoice.get("amount_paid") or 0) / 100.0
                        Payment.objects.create(
                            client=subscription.client,
                            subscription=subscription,
                            amount=amount_paid if amount_paid > 0 else subscription.amount,
                            status="success",
                            stripe_invoice_id=invoice.get("id"),
                            paid_at=timezone.now(),
                            stripe_event_id=event_id,
                        )

        # Payment failed
        elif event_type == "invoice.payment_failed":
            invoice = event["data"]["object"]
            stripe_subscription_id = invoice.get(
                "subscription"
            )

            if stripe_subscription_id:
                try:
                    subscription = Subscription.objects.get(
                        stripe_subscription_id=stripe_subscription_id
                    )
                except Subscription.DoesNotExist:
                    subscription = Subscription.objects.filter(
                        stripe_customer_id=invoice.get("customer")
                    ).first()

                if subscription:
                    payment = Payment.objects.filter(
                        subscription=subscription,
                        status="created",
                    ).order_by("-created_at").first()

                    if payment:
                        payment.status = "failed"
                        payment.stripe_invoice_id = invoice.get("id")
                        payment.stripe_event_id = event_id
                        payment.save()
                    else:
                        amount_due = (invoice.get("amount_due") or 0) / 100.0
                        Payment.objects.create(
                            client=subscription.client,
                            subscription=subscription,
                            amount=amount_due if amount_due > 0 else subscription.amount,
                            status="failed",
                            stripe_invoice_id=invoice.get("id"),
                            stripe_event_id=event_id,
                        )

        # Subscription cancelled
        elif event_type == "customer.subscription.deleted":
            stripe_subscription_id = event["data"]["object"]["id"]

            try:
                subscription = Subscription.objects.get(
                    stripe_subscription_id=stripe_subscription_id
                )
                subscription.status = "cancelled"
                subscription.save(
                    update_fields=[
                        "status",
                        "updated_at",
                    ]
                )
            except Subscription.DoesNotExist:
                pass

        return Response(
            {"message": "Webhook received."},
            status=status.HTTP_200_OK,
        )