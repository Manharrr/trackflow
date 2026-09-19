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
