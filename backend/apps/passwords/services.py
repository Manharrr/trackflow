import random
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.passwords.models import PasswordResetToken
from apps.authentication.services import send_sms


def generate_otp():
    """
    Generates a random 6-digit numeric string.
    """
    return str(random.randint(100000, 999999))


def create_password_reset_token(phone):
    """
    Looks up the user by phone, cleans up previous unused reset tokens,
    generates a 6-digit OTP, hashes it into a PasswordResetToken instance,
    and sends the verification code via Twilio SMS.
    """
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        raise ValidationError({"phone": "User with this phone number not found."})

    # Clear previous unused reset request tokens to prevent reuse issues
    PasswordResetToken.objects.filter(user=user, is_used=False).delete()

    otp = generate_otp()

    record = PasswordResetToken.objects.create(
        user=user,
        otp_hash=make_password(otp),
        expires_at=PasswordResetToken.expiry_time(),
    )

    # Dispatches SMS
    message = f"Your TrackFlow AI password reset OTP is {otp}"
    send_sms(phone, message)

    return record


def verify_password_reset_otp(phone, otp):
    """
    Looks up the user and checks if the given OTP matches the latest
    unused and unexpired PasswordResetToken record.
    """
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        raise ValidationError({"phone": "User not found."})

    try:
        record = PasswordResetToken.objects.filter(
            user=user,
            is_used=False,
        ).latest("created_at")
    except PasswordResetToken.DoesNotExist:
        raise ValidationError({"otp": "No active password reset request found for this user."})

    if record.is_expired:
        raise ValidationError({"otp": "The verification OTP code has expired."})

    if not record.verify(otp):
        raise ValidationError({"otp": "Invalid verification OTP code."})

    return record


def reset_password_with_otp(phone, otp, password):
    """
    Atomically verifies the reset request, updates the user's password,
    and marks the reset token as used to prevent replays.
    """
    from django.db import transaction

    with transaction.atomic():
        record = verify_password_reset_otp(phone, otp)
        user = record.user
        user.set_password(password)
        user.save()

        record.is_used = True
        record.save(update_fields=["is_used"])

    return True