from django.db import models

from django.conf import settings

from django_tenants.models import TenantMixin
from django_tenants.models import DomainMixin


class Client(TenantMixin):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    name = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=15
    )

    verified = models.BooleanField(
        default=False
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    logo = models.ImageField(
        upload_to="company_logos/",
        blank=True,
        null=True,
    )

    address = models.TextField(
        blank=True
    )

    description = models.TextField(
        blank=True
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    auto_create_schema = False

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass


class UserTenant(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspaces",
    )

    tenant = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="user_tenants",
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )
    is_active = models.BooleanField(
        default=True
    )
    

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "tenant",
                ],
                name="unique_user_per_tenant",
            )
        ]

    def __str__(self):

        return (
            f"{self.user.email} - {self.tenant.name}"
        )
    


class Subscription(models.Model):

    STATUS_CHOICES = (
        ("payment_pending", "Payment Pending"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    )

    BILLING_CHOICES = (
        ("monthly", "Monthly"),
    )

    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name="subscription",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1000.00,
    )

    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CHOICES,
        default="monthly",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="payment_pending",
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    stripe_customer_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    stripe_subscription_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        unique=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.client.name} - {self.status}"


class Payment(models.Model):

    STATUS_CHOICES = (
        ("created", "Created"),
        ("success", "Success"),
        ("failed", "Failed"),
    )

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="created",
    )

    stripe_checkout_session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        unique=True,
    )

    stripe_payment_intent_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    stripe_invoice_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    stripe_event_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        unique=True,
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.client.name} - ₹{self.amount} - {self.status}"