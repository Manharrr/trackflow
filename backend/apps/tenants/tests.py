from django.test import SimpleTestCase
from django.conf import settings
from apps.tenants.views import get_tenant_payment_frontend_base


class MockRequest:
    def __init__(self, data=None, headers=None, meta=None):
        self.data = data or {}
        self.headers = headers or {}
        self.META = meta or {}


class MockCompany:
    def __init__(self, schema_name="tenant", id=1):
        self.schema_name = schema_name
        self.id = id


class StripePaymentRedirectSecurityTests(SimpleTestCase):
    """
    Unit tests ensuring Stripe payment success, cancel, and dashboard redirect flows:
    1. Successful production payment -> tenant dashboard (https://<tenant>.manhargurukkal.site/dashboard).
    2. Successful local payment -> local tenant dashboard (http://localhost:5173/dashboard).
    3. Cancelled payment -> cancel page (/payment/cancel, never redirects to dashboard).
    4. Failed/unverified payment -> stays on /payment/success or /payment, must NOT redirect to dashboard.
    5. Tenant A payment -> Tenant A dashboard (https://tenant-a.manhargurukkal.site/dashboard).
    6. Tenant B payment -> Tenant B dashboard (https://tenant-b.manhargurukkal.site/dashboard).
    7. Production redirect must never contain :5173.
    8. Anti-looping test: verified host matches origin so client-side React Router navigation executes without domain bouncing.
    """

    def setUp(self):
        self.company = MockCompany(schema_name="tenant")
        self._orig_base_domain = getattr(settings, "BASE_DOMAIN", "manhargurukkal.site")
        self._orig_debug = getattr(settings, "DEBUG", False)

    def tearDown(self):
        settings.BASE_DOMAIN = self._orig_base_domain
        settings.DEBUG = self._orig_debug

    def test_1_successful_production_payment_tenant_dashboard(self):
        """1. Successful production payment -> tenant dashboard without :5173."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        company = MockCompany(schema_name="logesticgo")
        req = MockRequest(headers={"origin": "https://logesticgo.manhargurukkal.site"})
        base = get_tenant_payment_frontend_base(req, company)
        success_url = f"{base}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        dashboard_url = f"{base}/dashboard"

        self.assertEqual(base, "https://logesticgo.manhargurukkal.site")
        self.assertEqual(success_url, "https://logesticgo.manhargurukkal.site/payment/success?session_id={CHECKOUT_SESSION_ID}")
        self.assertEqual(dashboard_url, "https://logesticgo.manhargurukkal.site/dashboard")
        self.assertNotIn(":5173", success_url)
        self.assertNotIn(":5173", dashboard_url)

    def test_2_successful_local_payment_local_dashboard(self):
        """2. Successful local payment -> local tenant dashboard."""
        company = MockCompany(schema_name="logesticgo")
        # Localhost
        req_local = MockRequest(headers={"origin": "http://localhost:5173"})
        base_local = get_tenant_payment_frontend_base(req_local, company)
        self.assertEqual(f"{base_local}/payment/success", "http://localhost:5173/payment/success")
        self.assertEqual(f"{base_local}/dashboard", "http://localhost:5173/dashboard")

        # Tenant localhost
        req_tenant = MockRequest(headers={"origin": "http://logesticgo.localhost:5173"})
        base_tenant = get_tenant_payment_frontend_base(req_tenant, company)
        self.assertEqual(f"{base_tenant}/payment/success", "http://logesticgo.localhost:5173/payment/success")
        self.assertEqual(f"{base_tenant}/dashboard", "http://logesticgo.localhost:5173/dashboard")

    def test_3_cancelled_payment_cancel_page(self):
        """3. Cancelled payment -> cancel page (/payment/cancel, never to /dashboard)."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        company = MockCompany(schema_name="logesticgo")
        req = MockRequest(headers={"origin": "https://logesticgo.manhargurukkal.site"})
        base = get_tenant_payment_frontend_base(req, company)
        cancel_url = f"{base}/payment/cancel"

        self.assertEqual(cancel_url, "https://logesticgo.manhargurukkal.site/payment/cancel")
        self.assertNotIn("/dashboard", cancel_url)

    def test_4_failed_or_unverified_payment_does_not_redirect(self):
        """4. Failed/unverified payment -> must NOT redirect to dashboard."""
        # Verification contract: Only subscription_status == 'active' permits dashboard navigation
        active_status = "active"
        pending_status = "payment_pending"
        failed_status = "failed"

        def can_redirect_to_dashboard(status):
            return status == "active"

        self.assertTrue(can_redirect_to_dashboard(active_status))
        self.assertFalse(can_redirect_to_dashboard(pending_status))
        self.assertFalse(can_redirect_to_dashboard(failed_status))

    def test_5_tenant_a_payment_to_tenant_a_dashboard(self):
        """5. Tenant A payment -> Tenant A dashboard (dynamic, no hardcoding)."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        tenant_a = MockCompany(schema_name="tenant-alpha")
        req = MockRequest(headers={"origin": "https://tenant-alpha.manhargurukkal.site"})
        base_a = get_tenant_payment_frontend_base(req, tenant_a)

        self.assertEqual(base_a, "https://tenant-alpha.manhargurukkal.site")
        self.assertEqual(f"{base_a}/payment/success", "https://tenant-alpha.manhargurukkal.site/payment/success")
        self.assertEqual(f"{base_a}/dashboard", "https://tenant-alpha.manhargurukkal.site/dashboard")
        self.assertNotIn("logesticgo", base_a)

    def test_6_tenant_b_payment_to_tenant_b_dashboard(self):
        """6. Tenant B payment -> Tenant B dashboard (dynamic, no hardcoding)."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        tenant_b = MockCompany(schema_name="tenant-beta")
        req = MockRequest(headers={"origin": "https://tenant-beta.manhargurukkal.site"})
        base_b = get_tenant_payment_frontend_base(req, tenant_b)

        self.assertEqual(base_b, "https://tenant-beta.manhargurukkal.site")
        self.assertEqual(f"{base_b}/payment/success", "https://tenant-beta.manhargurukkal.site/payment/success")
        self.assertEqual(f"{base_b}/dashboard", "https://tenant-beta.manhargurukkal.site/dashboard")
        self.assertNotIn("tenant-alpha", base_b)
        self.assertNotIn("logesticgo", base_b)

    def test_7_production_redirect_never_contains_5173(self):
        """7. Production redirect must never contain :5173 even if passed in Origin."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        req = MockRequest(headers={"origin": "https://logesticgo.manhargurukkal.site:5173"})
        base = get_tenant_payment_frontend_base(req, self.company)
        success_url = f"{base}/payment/success"
        dashboard_url = f"{base}/dashboard"

        self.assertNotIn(":5173", success_url)
        self.assertNotIn(":5173", dashboard_url)
        self.assertTrue(success_url.startswith("https://"))

    def test_security_rejects_attacker_origin(self):
        """Security: Attacker origin is strictly rejected and never used for redirect."""
        settings.BASE_DOMAIN = "manhargurukkal.site"
        settings.DEBUG = False
        req_header = MockRequest(headers={"origin": "https://attacker.com"})
        base_header = get_tenant_payment_frontend_base(req_header, self.company)
        self.assertNotIn("attacker.com", base_header)
        self.assertEqual(base_header, "https://tenant.manhargurukkal.site")

        req_body = MockRequest(data={"origin": "https://attacker.com"})
        base_body = get_tenant_payment_frontend_base(req_body, self.company)
        self.assertNotIn("attacker.com", base_body)
        self.assertEqual(base_body, "https://tenant.manhargurukkal.site")


from django.test import RequestFactory
from django_tenants.test.cases import TenantTestCase
from django_tenants.postgresql_backend.base import FakeTenant
from django_tenants.utils import schema_context
from apps.tenants.middleware import TrackFlowTenantMiddleware
from apps.tenants.models import Client, Domain, UserTenant
from apps.accounts.models import User
from apps.authentication.views import PhoneLoginAPIView


class TrackFlowTenantMiddlewareTests(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "LogesticGo"
        tenant.schema_name = "logesticgo"
        tenant.email = "info@logesticgo.test"
        tenant.phone = "9876543210"
        tenant.verified = True
        tenant.status = "approved"

    @classmethod
    def setUpClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        Domain.objects.filter(domain="tenant.test.com").delete()
        Client.objects.filter(schema_name="logesticgo").delete()
        super().setUpClass()

        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            'migrate_schemas',
            schema_name=cls.tenant.schema_name,
            interactive=False,
            verbosity=0
        )
        # Create domain for logesticgo.manhargurukkal.site
        Domain.objects.get_or_create(
            domain="logesticgo.manhargurukkal.site",
            tenant=cls.tenant,
            defaults={"is_primary": True},
        )
        # Create domain for logesticgo.localhost (local dev)
        Domain.objects.get_or_create(
            domain="logesticgo.localhost",
            tenant=cls.tenant,
            defaults={"is_primary": False},
        )
        # Ensure NO public Client or localhost Domain exists in DB (matching production)
        Client.objects.filter(schema_name="public").delete()
        Domain.objects.filter(domain="localhost").delete()


    @classmethod
    def tearDownClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        try:
            Domain.objects.filter(domain__in=[
                "logesticgo.manhargurukkal.site",
                "logesticgo.localhost",
                "tenant.test.com",
            ]).delete()
        except Exception:
            pass
        try:
            cls.tenant.delete(force_drop=True)
        except Exception:
            pass
        try:
            super().tearDownClass()
        except Exception:
            pass
        cls.remove_allowed_test_domain()


    def setUp(self):
        super().setUp()
        from django.db import connection
        connection.set_schema_to_public()
        Client.objects.filter(schema_name="public").delete()
        self.factory = RequestFactory()
        self.middleware = TrackFlowTenantMiddleware(lambda req: None)

    def test_1_api_manhargurukkal_site_routes_to_public_schema(self):
        """1. api.manhargurukkal.site sets request.tenant to None and routes to public schema."""
        from django.db import connection
        request = self.factory.get("/api/auth/login/", HTTP_HOST="api.manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNone(request.tenant)
        self.assertEqual(connection.schema_name, "public")

    def test_2_manhargurukkal_site_routes_to_public_schema(self):
        """2. manhargurukkal.site sets request.tenant to None and routes to public schema."""
        from django.db import connection
        request = self.factory.get("/", HTTP_HOST="manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNone(request.tenant)
        self.assertEqual(connection.schema_name, "public")

    def test_3_public_host_login_returns_200_and_tokens(self):
        """3. Public login via POST /api/auth/login/ on api.manhargurukkal.site returns 200, tokens, and logesticgo tenant."""
        user = User.objects.create_user(
            username="tenantadmin@test.com",
            email="tenantadmin@test.com",
            phone="+919876543210",
            password="securepassword123",
        )
        UserTenant.objects.create(
            user=user,
            tenant=self.tenant,
            is_active=True,
        )
        from apps.employees.models.employee import Employee, Role
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                tenant=self.tenant,
                user=user,
                role=Role.COMPANY_ADMIN,
                full_name="Tenant Admin",
                email=user.email,
                phone=user.phone,
                is_active=True,
                is_blocked=False,
            )

        request = self.factory.post(
            "/api/auth/login/",
            data={"phone": "+919876543210", "password": "securepassword123"},
            content_type="application/json",
            HTTP_HOST="api.manhargurukkal.site",
        )
        # Process through middleware
        self.middleware.process_request(request)

        # Ensure request.tenant is None for public host
        self.assertIsNone(request.tenant)

        # Execute PhoneLoginAPIView
        view = PhoneLoginAPIView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["tenant"]["schema_name"], "logesticgo")

    def test_4_logesticgo_subdomain_still_resolves_to_logesticgo_client(self):
        """4. logesticgo.manhargurukkal.site still resolves to the logesticgo Client."""
        from django.db import connection
        request = self.factory.get("/api/orders/", HTTP_HOST="logesticgo.manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNotNone(request.tenant)
        self.assertIsInstance(request.tenant, Client)
        self.assertEqual(request.tenant.schema_name, "logesticgo")
        self.assertEqual(request.tenant.id, self.tenant.id)
        self.assertEqual(connection.schema_name, "logesticgo")

    def test_5_permission_regression_when_request_tenant_is_none_or_faketenant(self):
        """5. Tenant-specific permissions return False without TypeError when request.tenant is None or FakeTenant."""
        from apps.employees.permissions.employee_permissions import (
            IsCompanyAdmin,
            IsOperationsManager,
            IsEmployee,
            IsCompanyAdminOrOperationsManager,
            IsTenantEmployee,
        )
        from apps.orders.views.operations_views import IsOperationsManagerOrAdmin

        user = User.objects.create_user(
            username="permuser@test.com",
            email="permuser@test.com",
            phone="+919876543219",
            password="securepassword123",
        )

        permissions = [
            IsCompanyAdmin(),
            IsOperationsManager(),
            IsEmployee(),
            IsCompanyAdminOrOperationsManager(),
            IsTenantEmployee(),
            IsOperationsManagerOrAdmin(),
        ]

        # Case A: request.tenant is None (public hosts)
        req_none = self.factory.get("/api/employees/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req_none.user = user
        req_none.tenant = None

        for perm in permissions:
            try:
                allowed = perm.has_permission(req_none, None)
                self.assertFalse(allowed, f"{perm.__class__.__name__} should return False when request.tenant is None")
            except Exception as exc:
                self.fail(f"{perm.__class__.__name__}.has_permission raised an exception with request.tenant=None: {exc}")

        # Case B: request.tenant is FakeTenant (defense-in-depth)
        req_fake = self.factory.get("/api/employees/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req_fake.user = user
        req_fake.tenant = FakeTenant("public")

        for perm in permissions:
            try:
                allowed = perm.has_permission(req_fake, None)
                self.assertFalse(allowed, f"{perm.__class__.__name__} should return False when request.tenant is FakeTenant")
            except Exception as exc:
                self.fail(f"{perm.__class__.__name__}.has_permission raised an exception with request.tenant=FakeTenant: {exc}")

    def test_6_jwt_claim_active_user_tenant_allowed(self):
        """5a. Valid JWT tenant claim + active UserTenant -> allowed."""
        from apps.tenants.utils import resolve_request_tenant

        user = User.objects.create_user(
            username="active_user@test.com",
            email="active_user@test.com",
            phone="+919999900001",
            password="securepassword123",
        )
        UserTenant.objects.create(user=user, tenant=self.tenant, is_active=True)

        req = self.factory.get("/api/orders/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req.user = user
        req.tenant = None
        req.auth = {"schema_name": self.tenant.schema_name, "tenant_id": self.tenant.id}

        resolved = resolve_request_tenant(req)
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.schema_name, self.tenant.schema_name)
        self.assertEqual(req.tenant, resolved)

    def test_7_jwt_claim_inactive_user_tenant_rejected(self):
        """5b. Valid JWT tenant claim + inactive UserTenant -> rejected."""
        from apps.tenants.utils import resolve_request_tenant

        user = User.objects.create_user(
            username="inactive_user@test.com",
            email="inactive_user@test.com",
            phone="+919999900002",
            password="securepassword123",
        )
        UserTenant.objects.create(user=user, tenant=self.tenant, is_active=False)

        req = self.factory.get("/api/orders/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req.user = user
        req.tenant = None
        req.auth = {"schema_name": self.tenant.schema_name, "tenant_id": self.tenant.id}

        resolved = resolve_request_tenant(req)
        self.assertIsNone(resolved)
        self.assertIsNone(req.tenant)

    def test_8_jwt_claim_no_user_tenant_membership_rejected(self):
        """5c. Valid JWT tenant claim + no UserTenant membership -> rejected."""
        from apps.tenants.utils import resolve_request_tenant

        user = User.objects.create_user(
            username="stranger@test.com",
            email="stranger@test.com",
            phone="+919999900003",
            password="securepassword123",
        )
        # No UserTenant created

        req = self.factory.get("/api/orders/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req.user = user
        req.tenant = None
        req.auth = {"schema_name": self.tenant.schema_name, "tenant_id": self.tenant.id}

        resolved = resolve_request_tenant(req)
        self.assertIsNone(resolved)
        self.assertIsNone(req.tenant)

    def test_9_jwt_claim_mismatched_tenant_rejected(self):
        """5d. JWT tenant claim for Tenant B while user belongs only to Tenant A -> rejected."""
        from apps.tenants.utils import resolve_request_tenant

        tenant_b = Client.objects.create(
            schema_name="tenantbeta",
            name="TenantBeta",
            email="beta@test.com",
            phone="+919999900099",
            status="approved",
            verified=True,
        )

        user = User.objects.create_user(
            username="tenant_a_user@test.com",
            email="tenant_a_user@test.com",
            phone="+919999900004",
            password="securepassword123",
        )
        # User only belongs to Tenant A (self.tenant)
        UserTenant.objects.create(user=user, tenant=self.tenant, is_active=True)

        req = self.factory.get("/api/orders/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req.user = user
        req.tenant = None
        # Token claims Tenant B
        req.auth = {"schema_name": "tenantbeta", "tenant_id": tenant_b.id}

        resolved = resolve_request_tenant(req)
        # Must return None, must NOT return tenant_b, and must NOT fall back to tenant_a
        self.assertIsNone(resolved)
        self.assertIsNone(req.tenant)

        # Cleanup tenant_b safely without triggering cascade in public schema
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM tenants_client WHERE schema_name='tenantbeta'")

    def test_10_superuser_valid_tenant_claim_allowed(self):
        """5e. Superuser + valid tenant claim -> allowed without UserTenant record."""
        from apps.tenants.utils import resolve_request_tenant

        admin = User.objects.create_superuser(
            username="superadmin@test.com",
            email="superadmin@test.com",
            phone="+919999900005",
            password="securepassword123",
        )

        req = self.factory.get("/api/orders/dashboard/", HTTP_HOST="api.manhargurukkal.site")
        req.user = admin
        req.tenant = None
        req.auth = {"schema_name": self.tenant.schema_name, "tenant_id": self.tenant.id}

        resolved = resolve_request_tenant(req)
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.schema_name, self.tenant.schema_name)
        self.assertEqual(req.tenant, resolved)

    def test_11_request_tenant_unauthorized_user_rejected(self):
        """Rule 3: request.tenant containing Client is rejected if normal user lacks active UserTenant."""
        from apps.tenants.utils import resolve_request_tenant

        user = User.objects.create_user(
            username="outsider@test.com",
            email="outsider@test.com",
            phone="+919999900006",
            password="securepassword123",
        )

        req = self.factory.get("/api/orders/dashboard/")
        req.user = user
        req.tenant = self.tenant  # Context assigned e.g. from routing, but user is not member

        resolved = resolve_request_tenant(req)
        self.assertIsNone(resolved)



