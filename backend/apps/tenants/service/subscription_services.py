from django.db import transaction
from apps.tenants.models import Subscription


@transaction.atomic
def create_pending_subscription(client):
    subscription, created = Subscription.objects.get_or_create(
        client=client,
        defaults={
            "amount": 1000.00,
            "billing_cycle": "monthly",
            "status": "payment_pending",
        },
    )

    return subscription