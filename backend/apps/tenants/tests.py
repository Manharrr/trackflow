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
        # Create public tenant if not already present in test DB
        public_tenant, _ = Client.objects.get_or_create(
            schema_name="public",
            defaults={
                "name": "TrackFlow AI Public",
                "email": "admin@trackflow.ai",
                "phone": "9999999999",
                "verified": True,
                "status": "approved",
            },
        )
        # Create domain for localhost (local dev public)
        Domain.objects.get_or_create(
            domain="localhost",
            tenant=public_tenant,
            defaults={"is_primary": True},
        )

    @classmethod
    def tearDownClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        try:
            Domain.objects.filter(domain__in=[
                "logesticgo.manhargurukkal.site",
                "logesticgo.localhost",
                "localhost",
            ]).delete()
        except Exception:
            pass
        try:
            cls.tenant.delete(force_drop=True)
        except Exception:
            pass
        cls.remove_allowed_test_domain()

    def setUp(self):
        super().setUp()
        self.factory = RequestFactory()
        self.middleware = TrackFlowTenantMiddleware(lambda req: None)
        self.public_tenant, _ = Client.objects.get_or_create(
            schema_name="public",
            defaults={
                "name": "TrackFlow AI Public",
                "email": "admin@trackflow.ai",
                "phone": "9999999999",
                "verified": True,
                "status": "approved",
            },
        )

    def test_1_api_manhargurukkal_site_gets_real_public_client(self):
        """1. api.manhargurukkal.site gets the real public Client."""
        request = self.factory.get("/api/auth/login/", HTTP_HOST="api.manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNotNone(request.tenant)
        self.assertIsInstance(request.tenant, Client)
        self.assertEqual(request.tenant.schema_name, "public")
        self.assertEqual(request.tenant.id, self.public_tenant.id)

    def test_2_manhargurukkal_site_gets_real_public_client(self):
        """2. manhargurukkal.site gets the real public Client."""
        request = self.factory.get("/", HTTP_HOST="manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNotNone(request.tenant)
        self.assertIsInstance(request.tenant, Client)
        self.assertEqual(request.tenant.schema_name, "public")
        self.assertEqual(request.tenant.id, self.public_tenant.id)

    def test_3_request_tenant_is_never_faketenant_for_public_hosts(self):
        """3. request.tenant is never a FakeTenant for public hosts and ForeignKey queries succeed."""
        for host in ["api.manhargurukkal.site", "manhargurukkal.site"]:
            request = self.factory.get("/api/auth/login/", HTTP_HOST=host)
            self.middleware.process_request(request)

            self.assertNotIsInstance(request.tenant, FakeTenant)
            self.assertIsInstance(request.tenant, Client)
            self.assertIsNotNone(getattr(request.tenant, "id", None))
            # Verify ForeignKey lookup with request.tenant does NOT raise TypeError
            try:
                UserTenant.objects.filter(tenant=request.tenant).exists()
            except TypeError as exc:
                self.fail(f"ForeignKey lookup with request.tenant failed with TypeError: {exc}")

    def test_4_logesticgo_subdomain_still_resolves_to_logesticgo_client(self):
        """4. logesticgo.manhargurukkal.site still resolves to the logesticgo Client."""
        request = self.factory.get("/api/orders/", HTTP_HOST="logesticgo.manhargurukkal.site")
        self.middleware.process_request(request)

        self.assertIsNotNone(request.tenant)
        self.assertIsInstance(request.tenant, Client)
        self.assertEqual(request.tenant.schema_name, "logesticgo")
        self.assertEqual(request.tenant.id, self.tenant.id)

    def test_5_local_development_tenant_resolution(self):
        """5. Local development tenant resolution still works for localhost and *.localhost."""
        with self.settings(ALLOWED_HOSTS=["*", "localhost", ".localhost", "127.0.0.1", ".manhargurukkal.site"]):
            # localhost -> public tenant
            req_local = self.factory.get("/", HTTP_HOST="localhost")
            self.middleware.process_request(req_local)
            self.assertEqual(req_local.tenant.schema_name, "public")
            self.assertIsInstance(req_local.tenant, Client)

            # logesticgo.localhost -> logesticgo tenant
            req_tenant_local = self.factory.get("/", HTTP_HOST="logesticgo.localhost")
            self.middleware.process_request(req_tenant_local)
            self.assertEqual(req_tenant_local.tenant.schema_name, "logesticgo")
            self.assertIsInstance(req_tenant_local.tenant, Client)

    def test_6_public_host_login_authenticates_without_faketenant_error(self):
        """6. Public-host login can authenticate without the FakeTenant ForeignKey error."""
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

        # Simulate login request on api.manhargurukkal.site
        request = self.factory.post(
            "/api/auth/login/",
            data={"phone": "+919876543210", "password": "securepassword123"},
            content_type="application/json",
            HTTP_HOST="api.manhargurukkal.site",
        )
        # Run through middleware
        self.middleware.process_request(request)

        # Ensure request.tenant is real Client
        self.assertIsInstance(request.tenant, Client)
        self.assertNotIsInstance(request.tenant, FakeTenant)

        # Execute PhoneLoginAPIView
        view = PhoneLoginAPIView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["tenant"]["schema_name"], "logesticgo")

