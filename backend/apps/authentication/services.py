import random
import pyotp
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from rest_framework_simplejwt.tokens import RefreshToken
from twilio.rest import Client as TwilioClient

from apps.accounts.models import User
from .models import PhoneOTP



# OTP GENERATION & DB MANAGEMENT

def generate_otp():
    """
    Generates a 6-digit random numeric string.
    """
    return str(random.randint(100000, 999999))


def create_phone_otp(phone, purpose, payload=None):
    """
    Deletes any existing unverified OTP for the given phone and purpose,
    generates a new OTP, hashes it, and stores it in the database.
    """
    PhoneOTP.objects.filter(
        phone=phone,
        purpose=purpose,
        is_verified=False,
    ).delete()

    otp = generate_otp()

    PhoneOTP.objects.create(
        phone=phone,
        purpose=purpose,
        otp_hash=make_password(otp),
        expires_at=PhoneOTP.expiry_time(),
        payload=payload,
    )

    return otp


def verify_phone_otp(phone, otp, purpose):
    """
    Verifies the OTP against the latest record in the database.
    Rate-limits the verification to a maximum of 5 attempts.
    """
    try:
        record = PhoneOTP.objects.filter(
            phone=phone,
            purpose=purpose,
            is_verified=False,
        ).latest("created_at")
    except PhoneOTP.DoesNotExist:
        return None

    if record.is_expired:
        return None

    if record.attempts >= 5:
        return None

    if not record.verify(otp):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return None

    record.is_verified = True
    record.used_at = timezone.now()
    record.save(update_fields=["is_verified", "used_at"])

    return record


# SMS TRANSMISSION (TWILIO)

def send_sms(phone, message):
    """
    Sends an SMS message to the specified phone number via Twilio.
    Prints to standard output in development environments, catching errors gracefully.
    """
    print("=" * 50)
    print(f"SMS TO: {phone}")
    print(f"BODY  : {message}")
    print("=" * 50)

    # Allow fallback if Twilio settings are missing
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER):
        print("Twilio settings are not fully configured. SMS outputted to console.")
        return

    try:
        to_phone = str(phone).strip()
        if not to_phone.startswith("+"):
            if len(to_phone) == 10 and to_phone.isdigit():
                to_phone = f"+91{to_phone}"
            else:
                to_phone = f"+{to_phone}"

        client = TwilioClient(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN,
        )
        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
    except Exception as e:
        print(f"Error during Twilio SMS transmission: {str(e)}")


def send_otp_sms(phone, otp):
    """
    Formulates and sends a standard verification OTP message via SMS.
    """
    message = f"Your TrackFlow AI OTP is {otp}"
    send_sms(phone, message)


# PASSWORD RESET EMAIL FALLBACK

def send_password_reset_email(email):
    """
    Sends a simple password reset notification email.
    """
    send_mail(
        subject="Password Reset",
        message="Password reset request received.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=True,
    )


# JWT TOKEN GENERATION

def generate_tokens(user, tenant=None):
    """
    Generates SimpleJWT access and refresh tokens for a user.
    Optionally embeds tenant details inside the token claims for tenant awareness.
    """
    refresh = RefreshToken.for_user(user)
    if tenant:
        refresh["tenant_id"] = tenant.id
        refresh["schema_name"] = tenant.schema_name
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# MULTI-FACTOR AUTHENTICATION (MFA)

def generate_mfa_secret(user):
    """
    Generates a secure 32-character TOTP secret key for the user if they don't have one.
    """
    if not user.mfa_secret:
        user.mfa_secret = pyotp.random_base32()
        user.save(update_fields=["mfa_secret"])
    return user.mfa_secret


def verify_mfa(user, code):
    """
    Verifies a 6-digit TOTP code against the user's secret key.
    """
    if not user.mfa_secret:
        return False
    totp = pyotp.TOTP(user.mfa_secret)
    # Allow 30 seconds clock drift tolerance
    return totp.verify(code, valid_window=1)


# USER OPERATIONS

def create_user(*, email, phone, password, **kwargs):
    """
    Creates a User record. If the password parameter is already hashed,
    it instantiates User directly to bypass duplicate hashing.
    """
    if password.startswith(("pbkdf2_sha256$", "bcrypt$", "argon2$")):
        user = User(
            username=email,
            email=email,
            phone=phone,
            password=password,
            **kwargs
        )
        user.save()
        return user
    else:
        return User.objects.create_user(
            username=email,
            email=email,
            phone=phone,
            password=password,
            **kwargs
        )


def find_user_by_phone(phone):
    """
    Finds a user by phone number, accommodating multiple formats:
    raw 10-digits, +91 prefix, spaces, dashes, or 91 country code.
    """
    if not phone:
        return None
    from django.db.models import Q

    clean_phone = str(phone).strip().replace(" ", "").replace("-", "")
    variants = {clean_phone}
    if clean_phone.startswith("+91"):
        variants.add(clean_phone[3:])
        variants.add(clean_phone[1:])  # 91...
    elif clean_phone.startswith("91") and len(clean_phone) == 12:
        variants.add(clean_phone[2:])
        variants.add(f"+{clean_phone}")
    elif len(clean_phone) == 10 and clean_phone.isdigit():
        variants.add(f"+91{clean_phone}")
        variants.add(f"91{clean_phone}")

    if len(clean_phone) >= 10:
        last10 = clean_phone[-10:]
        variants.add(last10)
        variants.add(f"+91{last10}")
        variants.add(f"91{last10}")

    return User.objects.filter(Q(phone__in=list(variants))).first()