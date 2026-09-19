import base64
import uuid
from io import BytesIO
import qrcode
import pyotp

from django.db import transaction
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.authentication.models import OTPPurpose, PhoneOTP
from apps.authentication.serializers import (
    CompanyRegisterSerializer,
    VerifyOTPSerializer,
    LoginSerializer,
    GoogleLoginSerializer,
    CompleteCompanySetupSerializer,
    ForgotPasswordSerializer,
    VerifyForgotOTPSerializer,
    ResetPasswordSerializer,
    MFAVerifySerializer,
    MFALoginSerializer,
)
from apps.authentication.services import (
    create_phone_otp,
    verify_phone_otp,
    send_otp_sms,
    create_user,
    generate_tokens,
    generate_mfa_secret,
    verify_mfa,
    find_user_by_phone,
    normalize_phone_number,
    build_workspace_url,
)
from apps.authentication.google_auth import verify_google_token
from apps.tenants.models import Client, UserTenant
from apps.employees.models.employee import Employee, Role

from apps.tenants.models import Domain


# 1. PHONE REGISTRATION & OTP VERIFICATION

class CompanyRegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CompanyRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Hash password and store in payload to avoid storing plain password
        payload = {
            "company_name": data["company_name"],
            "workspace_code": data["workspace_code"],
            "admin_name": data["admin_name"],
            "email": data["email"],
            "phone": data["phone"],
            "password": make_password(data["password"]),
        }

        # Generate Twilio OTP
        otp = create_phone_otp(
            phone=data["phone"],
            purpose=OTPPurpose.REGISTER,
            payload=payload,
        )

        # Send OTP
        send_otp_sms(phone=data["phone"], otp=otp)

        return Response(
            {"message": "OTP sent successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyOTPAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = serializer.validated_data["otp"]

        record = verify_phone_otp(
            phone=phone,
            otp=otp,
            purpose=OTPPurpose.REGISTER,
        )

        if not record:
            return Response(
                {"error": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = record.payload
        if not payload:
            return Response(
                {"error": "No registration payload associated with this OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = payload["email"]

        # Check if the user already exists (Google SSO Complete Setup case)
        user = User.objects.filter(email=email).first()
        if user:
            # Update phone to verified one
            user.phone = phone
            user.is_verified = True
            user.save(update_fields=["phone", "is_verified"])
        else:
            # Standard registration case - Create User
            user = create_user(
                email=email,
                phone=phone,
                password=payload["password"],
                first_name=payload.get("admin_name", ""),
                is_verified=True,
            )

        # Create Client in pending status (schema / domains NOT created here)
        Client.objects.create(
            schema_name=payload["workspace_code"],
            name=payload["company_name"],
            email=email,
            phone=phone,
            status="pending",
            verified=True,
        )

        # Remove OTP record
        record.delete()

        return Response(
            {
                "message": "Registration completed successfully. Waiting for Super Admin approval.",
                "company_status": "pending",
            },
            status=status.HTTP_201_CREATED,
        )


class ResendOTPAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = (request.data.get("phone") or "").strip()
        email = (request.data.get("email") or "").strip()
        purpose = request.data.get("purpose", OTPPurpose.REGISTER)

        if not phone and not email:
            return Response(
                {"error": "Phone number or email is required to resend verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if purpose == OTPPurpose.PASSWORD_RESET:
            user = None
            if phone:
                user = User.objects.filter(phone=phone).first()
            if not user and email:
                user = User.objects.filter(email=email).first()

            if not user:
                return Response(
                    {"error": "User with this phone/email was not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            otp = create_phone_otp(phone=user.phone, purpose=OTPPurpose.PASSWORD_RESET)
            send_otp_sms(phone=user.phone, otp=otp)
            return Response(
                {"message": "A new verification code has been dispatched to your phone."},
                status=status.HTTP_200_OK,
            )

        # Registration Flow (Standard Registration or Google SSO Setup)
        records = PhoneOTP.objects.filter(
            purpose=OTPPurpose.REGISTER,
            is_verified=False,
        )

        record = None
        if phone:
            clean_phone = phone.strip()
            record = (
                records.filter(phone=clean_phone).order_by("-created_at").first()
                or records.filter(phone=clean_phone.lstrip("+")).order_by("-created_at").first()
            )
            if not record and len(clean_phone) >= 10:
                record = records.filter(phone__endswith=clean_phone[-10:]).order_by("-created_at").first()

        # Fallback search by email inside JSON payload
        if not record and email:
            for rec in records.order_by("-created_at")[:30]:
                if rec.payload and rec.payload.get("email") == email:
                    record = rec
                    break

        if not record:
            return Response(
                {"error": "No pending registration found for this phone number. Please register again."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_phone = record.phone
        payload = record.payload

        # Generate fresh OTP and dispatch SMS
        otp = create_phone_otp(
            phone=target_phone,
            purpose=OTPPurpose.REGISTER,
            payload=payload,
        )
        send_otp_sms(phone=target_phone, otp=otp)

        return Response(
            {"message": "A new verification code has been dispatched to your phone."},
            status=status.HTTP_200_OK,
        )

# 2. GOOGLE SSO & COMPANY SETUP

class GoogleLoginAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        workspace_code = serializer.validated_data.get("workspace_code")

        google_user = verify_google_token(token)
        if not google_user.get("success"):
            return Response(
                {"error": google_user.get("error", "Invalid Google ID token.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = google_user["email"]
        google_id = google_user["sub"]
        full_name = google_user["name"]

        # Look up by email or google_id
        user = User.objects.filter(email=email).first() or User.objects.filter(google_id=google_id).first()

        if user:
            # Ensure existing account is linked as Google account
            if not user.is_google_account or not user.google_id:
                user.is_google_account = True
                user.google_id = google_id
                user.save(update_fields=["is_google_account", "google_id"])

            # Superuser login for Google SSO
            if user.is_superuser:
                if user.is_mfa_enabled:
                    return Response(
                        {
                            "mfa_required": True,
                            "email": user.email,
                        },
                        status=status.HTTP_200_OK,
                    )

                tokens = generate_tokens(user)
                response = Response(
                    {
                        "access": tokens["access"],
                        "refresh": tokens["refresh"],
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "phone": user.phone,
                            "role": "super_admin",
                        },
                    },
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    key="refresh_token",
                    value=tokens["refresh"],
                    httponly=True,
                    secure=settings.COOKIE_SECURE,
                    samesite="Lax",
                    domain=settings.SESSION_COOKIE_DOMAIN,
                    path="/",
                )
                return response

            # Lookup workspaces user belongs to
            user_tenants = UserTenant.objects.filter(user=user, is_active=True).select_related("tenant")
            
            # If no workspaces found, check if company setup is pending/rejected or complete company setup
            if not user_tenants.exists():
                client = Client.objects.filter(email=email).first()
                if client:
                    if client.status == "pending":
                        return Response(
                            {"message": "Company setup pending. Waiting for approval.", "company_status": "pending"},
                            status=status.HTTP_202_ACCEPTED,
                        )
                    elif client.status == "rejected":
                        return Response(
                            {"error": f"Your company registration was rejected. Reason: {client.rejection_reason or 'No reason provided.'}"},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                # No client exists, complete setup
                return Response(
                    {"status": "COMPLETE_COMPANY_SETUP", "email": email},
                    status=status.HTTP_200_OK,
                )

            # Workspace resolution
            selected_tenant = None
            
            if workspace_code:
                # User chose a workspace code from frontend
                user_tenant_mapping = user_tenants.filter(tenant__schema_name=workspace_code).first()
                if not user_tenant_mapping:
                    return Response(
                        {"error": "You do not belong to the selected workspace."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                selected_tenant = user_tenant_mapping.tenant
            else:
                # No workspace code provided
                if user_tenants.count() == 1:
                    # Exactly one workspace, auto-login
                    selected_tenant = user_tenants.first().tenant
                else:
                    # Multiple workspaces, return selector options to frontend
                    workspaces_list = [
                        {
                            "name": ut.tenant.name,
                            "workspace_code": ut.tenant.schema_name,
                        }
                        for ut in user_tenants
                    ]
                    return Response(
                        {
                            "multiple_workspaces": True,
                            "workspaces": workspaces_list,
                        },
                        status=status.HTTP_200_OK,
                    )

            # Validate Employee & Company status
            if not selected_tenant:
                return Response(
                    {"error": "Company not found."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if selected_tenant.status != "approved":
                return Response(
                    {"error": f"Your company status is {selected_tenant.status}. Access is restricted."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            from django_tenants.utils import schema_context
            with schema_context(selected_tenant.schema_name):
                employee = Employee.objects.filter(user=user).first()
                if not employee:
                    return Response(
                        {"error": "Employee profile not found in this workspace."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                
                employee_role = employee.role
                employee_is_active = employee.is_active
                employee_is_blocked = employee.is_blocked

            if not employee_is_active:
                return Response(
                    {"error": "Employee profile is inactive."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if employee_is_blocked:
                return Response(
                    {"error": "Employee profile has been blocked."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            domain = Domain.objects.filter(
                tenant=selected_tenant,
                is_primary=True,
            ).first()

            workspace_url = build_workspace_url(selected_tenant, domain=domain)

            # Check MFA
            if employee_role == Role.COMPANY_ADMIN:
                if user.is_mfa_enabled:
                    return Response(
                        {"mfa_required": True, "email": user.email,
                         "tenant": {
                            "schema_name": selected_tenant.schema_name,
                            "name": selected_tenant.name,
                            "workspace_url": workspace_url,
                    },
                         },
                        status=status.HTTP_200_OK,
                    )

            # Successful Google Login
            tokens = generate_tokens(user, tenant=selected_tenant)

            #domain switching logic implement here
            # domain = Domain.objects.filter(
            #     tenant=selected_tenant,
            #     is_primary=True,
            # ).first()

            # workspace_url = (
            #     f"http://{domain.domain}:5173"
            #     if domain else None
            # )
            response = Response(
                {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "phone": user.phone,
                        "role": employee_role,
                    },
                    "tenant": {
                        "schema_name": selected_tenant.schema_name,
                        "name": selected_tenant.name,
                        "workspace_url": workspace_url,
                    },
                },
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
                path="/",
            )
            return response

        else:
            # Create a temporary Google User without phone/company details
            temp_phone = f"tmp_{uuid.uuid4().hex[:10]}"
            user = User(
                username=email,
                email=email,
                phone=temp_phone,
                google_id=google_id,
                is_google_account=True,
                is_verified=True,
                first_name=full_name,
            )
            user.set_unusable_password()
            user.save()

            return Response(
                {"status": "COMPLETE_COMPANY_SETUP", "email": email},
                status=status.HTTP_200_OK,
            )

 
class CompleteCompanySetupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CompleteCompanySetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        email = data["email"]
        company_name = data["company_name"]
        workspace_code = data["workspace_code"]
        phone = data["phone"]

        try:
            User.objects.get(email=email, is_google_account=True)
        except User.DoesNotExist:
            return Response(
                {"error": "Temporary Google SSO account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = {
            "email": email,
            "company_name": company_name,
            "workspace_code": workspace_code,
            "phone": phone,
        }

        # Send Twilio OTP and store payload in PhoneOTP
        otp = create_phone_otp(
            phone=phone,
            purpose=OTPPurpose.REGISTER,
            payload=payload,
        )
        send_otp_sms(phone=phone, otp=otp)

        return Response(
            {"message": "OTP sent to complete company setup."},
            status=status.HTTP_200_OK,
        )



# 3. PHONE LOGIN

class PhoneLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        password = serializer.validated_data["password"]
        workspace_code = serializer.validated_data.get("workspace_code")

        user = find_user_by_phone(phone)
        if not user:
            return Response(
                {"error": "Invalid phone number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Authenticate using custom email authentication backend
        authenticated_user = authenticate(request, email=user.email, password=password)
        if not authenticated_user:
            return Response(
                {"error": "Invalid phone number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Superuser login bypass
        if user.is_superuser:
            if user.is_mfa_enabled:
                return Response(
                    {
                        "mfa_required": True,
                        "email": user.email,
                    },
                    status=status.HTTP_200_OK,
                )
            
            tokens = generate_tokens(user)
            response = Response(
                {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "phone": user.phone,
                        "role": "super_admin",
                     },
                },status=status.HTTP_200_OK
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
            )
            return response

    
        # Lookup workspaces user belongs to
        user_tenants = UserTenant.objects.filter(user=user, is_active=True).select_related("tenant")
        
        # If no workspaces found, check if company registration is pending or rejected
        if not user_tenants.exists():
            client = Client.objects.filter(email=user.email).first() or Client.objects.filter(phone=user.phone).first()
            if client:
                if client.status == "pending":
                    return Response(
                        {"message": "Company setup pending. Waiting for approval.", "company_status": "pending"},
                        status=status.HTTP_202_ACCEPTED,
                    )
                elif client.status == "rejected":
                    return Response(
                        {"error": f"Your company registration was rejected. Reason: {client.rejection_reason or 'No reason provided.'}"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            return Response(
                {"error": "NO_WORKSPACE_FOUND"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Workspace resolution
        selected_tenant = None
        
        if workspace_code:
            # User chose a workspace code from frontend
            user_tenant_mapping = user_tenants.filter(tenant__schema_name=workspace_code).first()
            if not user_tenant_mapping:
                return Response(
                    {"error": "You do not belong to the selected workspace."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            selected_tenant = user_tenant_mapping.tenant
        else:
            # No workspace code provided
            if user_tenants.count() == 1:
                # Exactly one workspace, auto-login
                selected_tenant = user_tenants.first().tenant
            else:
                # Multiple workspaces, return selector options to frontend
                workspaces_list = [
                    {
                        "name": ut.tenant.name,
                        "workspace_code": ut.tenant.schema_name,
                    }
                    for ut in user_tenants
                ]
                return Response(
                    {
                        "multiple_workspaces": True,
                        "workspaces": workspaces_list,
                    },
                    status=status.HTTP_200_OK,
                )

        # Verify company (tenant) exists and is approved
        if not selected_tenant:
            return Response(
                {"error": "Company not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if selected_tenant.status != "approved":
            return Response(
                {"error": f"Your company status is {selected_tenant.status}. Access is restricted."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django_tenants.utils import schema_context
        with schema_context(selected_tenant.schema_name):
            employee = Employee.objects.filter(user=user).first()
            if not employee:
                return Response(
                    {"error": "Employee profile not found in this workspace."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            employee_role = employee.role
            employee_is_active = employee.is_active
            employee_is_blocked = employee.is_blocked

        # Verify employee active and not blocked
        if not employee_is_active:
            return Response(
                {"error": "Employee profile is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if employee_is_blocked:
            return Response(
                {"error": "Employee profile has been blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )
        domain = Domain.objects.filter(
            tenant=selected_tenant,
            is_primary=True,
        ).first()

        workspace_url = build_workspace_url(selected_tenant, domain=domain)

        # Check MFA for Company Admin
        if employee_role == Role.COMPANY_ADMIN:
            if user.is_mfa_enabled:
                return Response(
                    {"mfa_required": True, "email": user.email,
                    "tenant":{
                        "schema_name":selected_tenant.schema_name,
                        "name":selected_tenant.name,
                        "workspace_url": workspace_url,
                    }
                     },
                    status=status.HTTP_200_OK,
                )

        # Successful direct login (Employees or Admins with MFA disabled)
        tokens = generate_tokens(user, tenant=selected_tenant)

        # domain switching implement here(subdoamin changes)
        

        

        response = Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "phone": user.phone,
                    "role": employee_role,
                },
                "tenant": {
                    "schema_name": selected_tenant.schema_name,
                    "name": selected_tenant.name,
                    "workspace_url": workspace_url,
                },  
                
            },
            status=status.HTTP_200_OK,
        )
        
    
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh"],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="Lax",
            domain=settings.SESSION_COOKIE_DOMAIN,
            path="/",
        )
        # print(response.cookies)
        return response


# 4. MFA (MULTI-FACTOR AUTHENTICATION)

class MFASetupAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Only Super Admin and Company Admin
        is_allowed = user.is_superuser

        if not is_allowed:
            user_tenant = UserTenant.objects.filter(user=user, is_active=True).first()
            if user_tenant:
                tenant = user_tenant.tenant
                from django_tenants.utils import schema_context
                with schema_context(tenant.schema_name):
                    employee = Employee.objects.filter(user=user).first()
                    if employee and employee.role == Role.COMPANY_ADMIN:
                        is_allowed = True

        if not is_allowed:
            return Response(
                {
                    "error": "MFA is only available for Super Admins and Company Admins."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        secret = generate_mfa_secret(user)

        import pyotp
        import base64
        from io import BytesIO

        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name="TrackFlow AI")

        qr = qrcode.make(uri)
        buffer = BytesIO()
        qr.save(buffer, format="PNG")
        qr_code_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return Response(
            {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_code_b64}",
                "account": user.email,
                "issuer": "TrackFlow AI",
                "message": "Open Microsoft Authenticator → Add Account → Other Account → Enter Setup Key manually.",
            },
            status=status.HTTP_200_OK,
        )
class MFAVerifyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        user = request.user

        is_allowed = user.is_superuser

        if not is_allowed:
            user_tenant = UserTenant.objects.filter(user=user, is_active=True).first()
            if user_tenant:
                tenant = user_tenant.tenant
                from django_tenants.utils import schema_context
                with schema_context(tenant.schema_name):
                    employee = Employee.objects.filter(user=user).first()
                    if employee and employee.role == Role.COMPANY_ADMIN:
                        is_allowed = True

        if not is_allowed:
            return Response(
                {
                    "error": "Only Super Admins and Company Admins can enable MFA."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not verify_mfa(user, code):
            return Response(
                {
                    "error": "Invalid verification code."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_mfa_enabled = True
        user.save(update_fields=["is_mfa_enabled"])

        return Response(
            {
                "message": "MFA enabled successfully."
            },
            status=status.HTTP_200_OK,
        )

class MFALoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MFALoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        workspace_code = serializer.validated_data.get("workspace_code")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_mfa_enabled:
            return Response(
                {"error": "MFA has not been enabled for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not verify_mfa(user, code):
            return Response(
                {"error": "Invalid MFA code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # SUPER ADMIN LOGIN
        if user.is_superuser:
            tokens = generate_tokens(user)

            response = Response(
                {
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "phone": user.phone,
                        "role": "super_admin",
                    },
                },
                status=status.HTTP_200_OK,
            )

            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh"],
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
                path="/",
            )

            return response

        # COMPANY ADMIN / EMPLOYEE
        user_tenants = UserTenant.objects.filter(user=user, is_active=True).select_related("tenant")
        if not user_tenants.exists():
            return Response(
                {"error": "No associated company workspace found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        selected_tenant = None
        if workspace_code:
            user_tenant_mapping = user_tenants.filter(tenant__schema_name=workspace_code).first()
            if user_tenant_mapping:
                selected_tenant = user_tenant_mapping.tenant

        if not selected_tenant:
            if user_tenants.count() == 1:
                selected_tenant = user_tenants.first().tenant
            else:
                return Response(
                    {"error": "Multiple workspaces detected. A workspace code must be provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if selected_tenant.status != "approved":
            return Response(
                {
                    "error": f"Your company status is {selected_tenant.status}. Access is restricted."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        from django_tenants.utils import schema_context
        with schema_context(selected_tenant.schema_name):
            employee = Employee.objects.filter(user=user).first()
            if not employee:
                return Response(
                    {"error": "Employee profile not found in this workspace."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            employee_role = employee.role
            employee_is_active = employee.is_active
            employee_is_blocked = employee.is_blocked

        if not employee_is_active:
            return Response(
                {"error": "Employee profile is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if employee_is_blocked:
            return Response(
                {"error": "Employee profile has been blocked."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = generate_tokens(user, tenant=selected_tenant)
        domain = Domain.objects.filter(
            tenant=selected_tenant,
            is_primary=True,
        ).first()

        workspace_url = build_workspace_url(selected_tenant, domain=domain)

        response = Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "phone": user.phone,
                    "role": employee_role,
                },
                 "tenant": {
                    "schema_name": selected_tenant.schema_name,
                    "name": selected_tenant.name,
                    "workspace_url": workspace_url,
                 },
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh"],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="Lax",
            domain=settings.SESSION_COOKIE_DOMAIN,
            path="/",
        )
        # print(response.cookies)

        return response

# 5. LOGOUT & REFRESH TOKEN

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required to log out."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

        response = Response(
            {"message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie("refresh_token", domain=settings.SESSION_COOKIE_DOMAIN, path="/", samesite="Lax")
        response.delete_cookie("refresh_token", path="/", samesite="Lax")
        return response


class RefreshAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import datetime
        import traceback
        from django.db import connection
        from rest_framework_simplejwt.tokens import RefreshToken

        current_time = datetime.datetime.now().isoformat()
        current_tenant = getattr(connection, "tenant", None)
        hostname = request.get_host()
        cookie_exists = "refresh_token" in request.COOKIES
        cookie_received = request.COOKIES.get("refresh_token")
        cookie_len = len(cookie_received) if cookie_received else 0

        refresh_token = request.data.get("refresh") or cookie_received

        decoded_jwt = None
        jti = None
        expiration = None
        if refresh_token:
            try:
                token_obj = RefreshToken(refresh_token)
                decoded_jwt = token_obj.payload
                jti = token_obj.payload.get("jti")
                exp = token_obj.payload.get("exp")
                if exp:
                    expiration = datetime.datetime.fromtimestamp(exp).isoformat()
            except Exception as e:
                decoded_jwt = f"Error decoding: {str(e)}"

        # print("=" * 60)
        # print(f"DEBUG REFRESH REQUEST AT: {current_time}")
        # print(f"Current Tenant: {current_tenant}")
        # print(f"Hostname: {hostname}")
        # print(f"Cookie Exists: {cookie_exists}")
        # print(f"Cookie Length: {cookie_len}")
        # print(f"Cookie Value (truncated): {cookie_received[:15] + '...' if cookie_received else 'None'}")
        # print(f"Decoded JWT Payload: {decoded_jwt}")
        # print(f"JTI: {jti}")
        # print(f"Expiration: {expiration}")
        # print("=" * 60)

        if not refresh_token:
            print("Reason for 400: Refresh token is missing (no cookie or body data found).")
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            response = Response(
                {"error": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            response.delete_cookie("refresh_token", domain=settings.SESSION_COOKIE_DOMAIN, path="/", samesite="Lax")
            response.delete_cookie("refresh_token", path="/", samesite="Lax")
            return response

        data = serializer.validated_data
        response = Response(data, status=status.HTTP_200_OK)

        new_refresh = data.get("refresh")
        if new_refresh:
            response.set_cookie(
                key="refresh_token",
                value=new_refresh,
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite="Lax",
                domain=settings.SESSION_COOKIE_DOMAIN,
                path="/",
            )
        return response


# 6. ME PROFILE API

class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        user_data = {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_mfa_enabled": user.is_mfa_enabled,
        }

        employee_data = None
        tenant_data = None
        role = None
        company_status = None

        # Resolve active tenant from token claims
        schema_name = None
        if request.auth and hasattr(request.auth, "get"):
            schema_name = request.auth.get("schema_name")

        if schema_name:
            try:
                tenant = Client.objects.get(schema_name=schema_name)
                tenant_data = {
                    "id": tenant.id,
                    "name": tenant.name,
                    "schema_name": tenant.schema_name,
                    "status": tenant.status,
                    "logo": tenant.logo.url if tenant.logo else None,
                    "address": tenant.address,
                    "description": tenant.description,
                }
                company_status = tenant.status

                from django_tenants.utils import schema_context
                with schema_context(tenant.schema_name):
                    employee = Employee.objects.filter(user=user).first()
                    if employee:
                        employee_data = {
                            "id": str(employee.id),
                            "full_name": employee.full_name,
                            "role": employee.role,
                            "department": employee.department,
                            "designation": employee.designation,
                            "is_active": employee.is_active,
                            "is_blocked": employee.is_blocked,
                            "profile_image": employee.profile_image.url if employee.profile_image else None,
                        }
                        role = employee.role
            except Client.DoesNotExist:
                pass
        elif user.is_superuser:
            role = "super_admin"
            company_status = "approved"

        return Response(
            {
                "user": user_data,
                "employee": employee_data,
                "tenant": tenant_data,
                "role": role,
                "company_status": company_status,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        user = request.user
        
        # Get active tenant schema from token claims
        schema_name = None
        if request.auth and hasattr(request.auth, "get"):
            schema_name = request.auth.get("schema_name")

        first_name = request.data.get("first_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        photo = request.FILES.get("photo") or request.FILES.get("profile_image")

        # Save to User model
        if first_name is not None:
            user.first_name = first_name
        if email:
            user.email = email
        if phone:
            user.phone = phone
        user.save()

        # If tenant schema is present, sync with tenant-isolated Employee record
        if schema_name:
            try:
                tenant = Client.objects.get(schema_name=schema_name)
                from django_tenants.utils import schema_context
                with schema_context(tenant.schema_name):
                    employee = Employee.objects.filter(user=user).first()
                    if employee:
                        if first_name is not None:
                            employee.full_name = first_name
                        if email:
                            employee.email = email
                        if phone:
                            employee.phone = phone
                        if photo:
                            employee.profile_image = photo
                        employee.save()
            except Client.DoesNotExist:
                pass

        # Return updated data (using the same format as GET)
        user_data = {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_mfa_enabled": user.is_mfa_enabled,
        }

        employee_data = None
        tenant_data = None
        role = None
        company_status = None

        if schema_name:
            try:
                tenant = Client.objects.get(schema_name=schema_name)
                tenant_data = {
                    "id": tenant.id,
                    "name": tenant.name,
                    "schema_name": tenant.schema_name,
                    "status": tenant.status,
                    "logo": tenant.logo.url if tenant.logo else None,
                    "address": tenant.address,
                    "description": tenant.description,
                }
                company_status = tenant.status

                from django_tenants.utils import schema_context
                with schema_context(tenant.schema_name):
                    employee = Employee.objects.filter(user=user).first()
                    if employee:
                        employee_data = {
                            "id": str(employee.id),
                            "full_name": employee.full_name,
                            "role": employee.role,
                            "department": employee.department,
                            "designation": employee.designation,
                            "is_active": employee.is_active,
                            "is_blocked": employee.is_blocked,
                            "profile_image": employee.profile_image.url if employee.profile_image else None,
                        }
                        role = employee.role
            except Client.DoesNotExist:
                pass
        elif user.is_superuser:
            role = "super_admin"
            company_status = "approved"

        return Response(
            {
                "user": user_data,
                "employee": employee_data,
                "tenant": tenant_data,
                "role": role,
                "company_status": company_status,
            },
            status=status.HTTP_200_OK,
        )


# 7. FORGOT & RESET PASSWORD

class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        user = find_user_by_phone(phone)
        if not user:
            return Response(
                {"error": "User with this phone number was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Generate OTP to user's registered phone
        otp = create_phone_otp(phone=user.phone, purpose=OTPPurpose.PASSWORD_RESET)
        send_otp_sms(phone=user.phone, otp=otp)

        return Response(
            {"message": "OTP sent successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyResetOTPAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyForgotOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = serializer.validated_data["otp"]

        user = find_user_by_phone(phone)
        target_phone = user.phone if user else phone

        record = verify_phone_otp(
            phone=target_phone,
            otp=otp,
            purpose=OTPPurpose.PASSWORD_RESET,
        )

        if not record:
            return Response(
                {"error": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "OTP verified successfully."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        password = serializer.validated_data["password"]

        user = find_user_by_phone(phone)
        target_phone = user.phone if user else phone

        try:
            record = PhoneOTP.objects.filter(
                phone=target_phone,
                purpose=OTPPurpose.PASSWORD_RESET,
                is_verified=True,
            ).latest("created_at")
        except PhoneOTP.DoesNotExist:
            return Response(
                {"error": "OTP verification required before password reset."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expire verification state after 10 minutes (600 seconds)
        if record.used_at:
            time_diff = timezone.now() - record.used_at
            if time_diff.total_seconds() > 600:
                return Response(
                    {"error": "OTP verification has expired. Please verify again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"error": "Invalid OTP verification state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user:
            return Response(
                {"error": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(password)
        user.save()

        # Delete verified state to prevent replay
        record.delete()

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not old_password or not new_password or not confirm_password:
            return Response(
                {"error": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "New passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": "New password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {"error": "Incorrect old password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )