from django_tenants.test.cases import TenantTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django_tenants.utils import schema_context
from django.db import connection

from apps.tenants.models import Client, Domain, UserTenant
from apps.employees.models.employee import Employee, Role
from apps.authentication.services import (
    find_user_by_phone,
    normalize_phone_number,
    build_workspace_url,
)
from apps.authentication.serializers import (
    CompanyRegisterSerializer,
    LoginSerializer,
    CompleteCompanySetupSerializer,
)

User = get_user_model()


class AuthenticationRegressionTests(TenantTestCase):
    """
    Comprehensive regression tests for:
    1. find_user_by_phone("+91 99959 77246") finds the user.
    2. find_user_by_phone("+919995977246") finds the same user.
    3. find_user_by_phone("9995977246") finds the same user.
    4. Login with formatted phone succeeds.
    5. Login with normalized phone succeeds.
    6. Super Admin login still succeeds.
    7. Company Admin tenant resolution still returns logesticgo.
    8. No FakeTenant/public-schema error occurs.
    9. Registration stores normalized phone numbers.
    10. Workspace URL uses HTTPS in production.
    """

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.schema_name = "logesticgo"
        tenant.name = "logesticgo"
        tenant.email = "companyadmin@logesticgo.test"
        tenant.phone = "+91 99959 77246"
        tenant.verified = True
        tenant.status = "approved"

    @classmethod
    def setUpClass(cls):
        connection.set_schema_to_public()
        with connection.cursor() as cursor:
            cursor.execute("DROP SCHEMA IF EXISTS logesticgo CASCADE")
            cursor.execute("DELETE FROM tenants_domain WHERE domain IN ('tenant.test.com', 'logesticgo.manhargurukkal.site')")
            cursor.execute("DELETE FROM tenants_client WHERE schema_name = 'logesticgo'")
        super().setUpClass()
        # Explicitly create schema and run tenant migrations since auto_create_schema is False on Client
        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            'migrate_schemas',
            schema_name=cls.tenant.schema_name,
            interactive=False,
            verbosity=0,
        )
        connection.set_schema_to_public()
        Domain.objects.get_or_create(
            domain="logesticgo.manhargurukkal.site",
            tenant=cls.tenant,
            defaults={"is_primary": True},
        )

    @classmethod
    def tearDownClass(cls):
        try:
            with schema_context(cls.tenant.schema_name):
                Employee.objects.all().delete()
        except Exception:
            pass
        connection.set_schema_to_public()
        try:
            UserTenant.objects.filter(tenant=cls.tenant).delete()
        except Exception:
            pass
        try:
            Domain.objects.filter(tenant=cls.tenant).delete()
        except Exception:
            pass
        try:
            Domain.objects.filter(domain__in=["tenant.test.com", "logesticgo.manhargurukkal.site"]).delete()
        except Exception:
            pass
        try:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM tenants_client WHERE id = %s", [cls.tenant.id])
        except Exception:
            pass
        cls.remove_allowed_test_domain()

    def setUp(self):
        super().setUp()
        self.client = APIClient()

        connection.set_schema_to_public()
        User.objects.all().delete()

        # 1. Create a Company Admin user with UNNORMALIZED phone (with spaces, simulating production legacy state)
        self.raw_company_admin_phone = "+91 99959 77246"
        self.company_admin_password = "SecurePassword123!"
        self.company_admin_user = User.objects.create_user(
            email="companyadmin@logesticgo.test",
            username="companyadmin@logesticgo.test",
            phone=self.raw_company_admin_phone,
            password=self.company_admin_password,
            first_name="Shabin",
            is_active=True,
            is_verified=True,
        )

        # 2. Create Super Admin user with normalized phone
        self.super_admin_phone = "+918330821816"
        self.super_admin_password = "SuperPassword123!"
        self.super_admin_user = User.objects.create_superuser(
            email="superadmin@trackflow.test",
            username="superadmin@trackflow.test",
            phone=self.super_admin_phone,
            password=self.super_admin_password,
            is_active=True,
            is_verified=True,
        )

        # 3. Create UserTenant mapping
        self.user_tenant = UserTenant.objects.create(
            user=self.company_admin_user,
            tenant=self.tenant,
            is_active=True,
        )

        # 4. Create Employee profile inside the tenant schema
        with schema_context(self.tenant.schema_name):
            Employee.objects.filter(user=self.company_admin_user).delete()
            self.employee = Employee.objects.create(
                tenant=self.tenant,
                user=self.company_admin_user,
                role=Role.COMPANY_ADMIN,
                full_name="Shabin",
                email=self.company_admin_user.email,
                phone=self.company_admin_user.phone,
                is_active=True,
                is_blocked=False,
            )

    # 1. find_user_by_phone("+91 99959 77246") finds the user
    def test_1_find_user_by_phone_with_formatted_input(self):
        found = find_user_by_phone("+91 99959 77246")
        self.assertIsNotNone(found)
        self.assertEqual(found.id, self.company_admin_user.id)
        self.assertEqual(found.email, self.company_admin_user.email)

    # 2. find_user_by_phone("+919995977246") finds the same user
    def test_2_find_user_by_phone_with_normalized_input(self):
        found = find_user_by_phone("+919995977246")
        self.assertIsNotNone(found)
        self.assertEqual(found.id, self.company_admin_user.id)

    # 3. find_user_by_phone("9995977246") finds the same user
    def test_3_find_user_by_phone_with_raw_10_digits(self):
        found = find_user_by_phone("9995977246")
        self.assertIsNotNone(found)
        self.assertEqual(found.id, self.company_admin_user.id)

        # Also test 91-prefix and input with arbitrary spaces
        found_91 = find_user_by_phone("919995977246")
        self.assertIsNotNone(found_91)
        self.assertEqual(found_91.id, self.company_admin_user.id)

        found_spaces = find_user_by_phone("99959 77246")
        self.assertIsNotNone(found_spaces)
        self.assertEqual(found_spaces.id, self.company_admin_user.id)

    # 4. Login with formatted phone succeeds
    def test_4_login_with_formatted_phone_succeeds(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "phone": "+91 99959 77246",
                "password": self.company_admin_password,
            },
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["role"], "company_admin")

    # 5. Login with normalized phone succeeds
    def test_5_login_with_normalized_phone_succeeds(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "phone": "+919995977246",
                "password": self.company_admin_password,
            },
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], "company_admin")

    # 6. Super Admin login still succeeds
    def test_6_super_admin_login_still_succeeds(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "phone": self.super_admin_phone,
                "password": self.super_admin_password,
            },
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], "super_admin")

    # 7. Company Admin tenant resolution still returns logesticgo
    def test_7_company_admin_tenant_resolution_returns_logesticgo(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "phone": "9995977246",
                "password": self.company_admin_password,
            },
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tenant_data = response.data.get("tenant")
        self.assertIsNotNone(tenant_data)
        self.assertEqual(tenant_data["schema_name"], "logesticgo")
        self.assertEqual(tenant_data["name"], "logesticgo")

    # 8. No FakeTenant/public-schema error occurs
    def test_8_no_faketenant_public_schema_error(self):
        # Explicitly verify login against public host api.manhargurukkal.site executes cleanly
        response = self.client.post(
            "/api/auth/login/",
            {
                "phone": "+91 99959 77246",
                "password": self.company_admin_password,
            },
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("FakeTenant", str(response.data))

    # 9. Registration stores normalized phone numbers
    def test_9_registration_stores_normalized_phone_numbers(self):
        raw_reg_phone = "+91 88888 77777"
        serializer = CompanyRegisterSerializer(
            data={
                "company_name": "New Logistics",
                "workspace_code": "newlogistics",
                "admin_name": "John Doe",
                "email": "johndoe@newlogistics.test",
                "phone": raw_reg_phone,
                "password": "Password123!",
                "confirm_password": "Password123!",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["phone"], "+918888877777")

        # Test normalize_phone_number utility directly on various formats
        self.assertEqual(normalize_phone_number("+91 99959 77246"), "+919995977246")
        self.assertEqual(normalize_phone_number("9995977246"), "+919995977246")
        self.assertEqual(normalize_phone_number("919995977246"), "+919995977246")
        self.assertEqual(normalize_phone_number("+91-99959-77246"), "+919995977246")

    # 10. Workspace URL uses HTTPS in production
    def test_10_workspace_url_uses_https_in_production(self):
        # Case A: Production domain (logesticgo.manhargurukkal.site) -> https:// without :5173
        domain = Domain.objects.filter(tenant=self.tenant, is_primary=True).first()
        prod_url = build_workspace_url(self.tenant, domain=domain)
        self.assertEqual(prod_url, "https://logesticgo.manhargurukkal.site")
        self.assertNotIn(":5173", prod_url)
        self.assertTrue(prod_url.startswith("https://"))

        # Case B: Local development domain -> http:// with :5173
        local_domain = Domain(domain="logesticgo.localhost", tenant=self.tenant)
        local_url = build_workspace_url(self.tenant, domain=local_domain)
        self.assertEqual(local_url, "http://logesticgo.localhost:5173")

    # 11. CORS allowed for tenant workspace domain logesticgo.manhargurukkal.site
    def test_11_tenant_api_cors_allowed_for_logesticgo(self):
        response = self.client.options(
            "/api/auth/token/refresh/",
            HTTP_ORIGIN="https://logesticgo.manhargurukkal.site",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "https://logesticgo.manhargurukkal.site",
        )
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Credentials"),
            "true",
        )

    # 12. CORS allowed dynamically for any valid tenant subdomain (e.g. abc.manhargurukkal.site)
    def test_12_tenant_api_cors_allowed_for_arbitrary_tenant_subdomain(self):
        response = self.client.options(
            "/api/auth/token/refresh/",
            HTTP_ORIGIN="https://abc.manhargurukkal.site",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "https://abc.manhargurukkal.site",
        )
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Credentials"),
            "true",
        )

    # 13. CORS rejected for unauthorized / external domains (e.g. evil-example.com)
    def test_13_cors_rejected_for_unauthorized_external_origin(self):
        response = self.client.options(
            "/api/auth/token/refresh/",
            HTTP_ORIGIN="https://evil-example.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    # 14. Refresh token accepted from shared HttpOnly cookie with empty body
    def test_14_token_refresh_via_cookie_only(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.company_admin_user)
        self.client.cookies["refresh_token"] = str(refresh)

        response = self.client.post(
            "/api/auth/token/refresh/",
            {},
            format="json",
            HTTP_ORIGIN="https://logesticgo.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"),
            "https://logesticgo.manhargurukkal.site",
        )
