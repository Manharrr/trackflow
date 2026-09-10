import stripe
from django.conf import settings


stripe.api_key = settings.STRIPE_SECRET_KEY


def create_stripe_checkout_session(
    subscription,
    success_url,
    cancel_url,
):
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        mode="subscription",

        line_items=[
            {
                "price": settings.STRIPE_PRICE_ID,
                "quantity": 1,
            }
        ],

        success_url=success_url,
        cancel_url=cancel_url,

        client_reference_id=str(subscription.client.id),

        metadata={
            "client_id": str(subscription.client.id),
            "subscription_id": str(subscription.id),
        },

        subscription_data={
            "metadata": {
                "client_id": str(subscription.client.id),
                "subscription_id": str(subscription.id),
            }
        },
    )

    return session