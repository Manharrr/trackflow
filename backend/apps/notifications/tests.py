from django_tenants.test.cases import TenantTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.urls import reverse
from django_tenants.utils import schema_context

from apps.tenants.models import Client, Domain, UserTenant
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

User = get_user_model()


class NotificationSchemaTestCase(TenantTestCase):

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.schema_name = "testnotif"
        tenant.name = "Notification Test Tenant A"
        tenant.email = "admin@notif-a.test"
        tenant.phone = "1111111111"
        tenant.verified = True
        tenant.status = "approved"

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "testnotif.test.com"

    @classmethod
    def setUpClass(cls):
        from django.db import connection
        with connection.cursor() as cursor:
            try:
                cursor.execute("DROP SCHEMA IF EXISTS testnotif CASCADE")
                cursor.execute("DELETE FROM tenants_domain WHERE domain='testnotif.test.com'")
                cursor.execute("DELETE FROM tenants_client WHERE schema_name='testnotif'")
            except Exception:
                pass

        super().setUpClass()
        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            "migrate_schemas",
            schema_name=cls.tenant.schema_name,
            interactive=False,
            verbosity=0,
        )
        from django.db import connection
        connection.set_tenant(cls.tenant)

    @classmethod
    def tearDownClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        with connection.cursor() as cursor:
            try:
                cursor.execute("DROP SCHEMA IF EXISTS testnotif CASCADE")
                cursor.execute("DELETE FROM tenants_domain WHERE domain='testnotif.test.com'")
                cursor.execute("DELETE FROM tenants_client WHERE schema_name='testnotif'")
            except Exception:
                pass

    def setUp(self):
        super().setUp()
        from django.db import connection
        connection.set_tenant(self.tenant)

        # User A in Tenant A
        self.user_a = User.objects.create_user(
            username="usera@notif.test",
            email="usera@notif.test",
            phone="1112223301",
        )
        self.user_a.is_verified = True
        self.user_a.save()

        UserTenant.objects.create(
            user=self.user_a,
            tenant=self.tenant,
            is_active=True,
        )

        # User B (different user, same tenant to test recipient isolation)
        self.user_b = User.objects.create_user(
            username="userb@notif.test",
            email="userb@notif.test",
            phone="1112223302",
        )
        self.user_b.is_verified = True
        self.user_b.save()

        UserTenant.objects.create(
            user=self.user_b,
            tenant=self.tenant,
            is_active=True,
        )

        # Other User (unaffiliated user, no UserTenant mapping)
        self.unaffiliated_user = User.objects.create_user(
            username="unaffiliated@notif.test",
            email="unaffiliated@notif.test",
            phone="1112223399",
        )
        self.unaffiliated_user.is_verified = True
        self.unaffiliated_user.save()

    def test_notification_query_in_tenant_schema_via_public_host(self):
        """
        Regression Test: GET /api/notifications/ via public API host (api.manhargurukkal.site)
        executes inside tenant schema without UndefinedTable error.
        """
        # Create a notification in tenant A
        notif = NotificationService.create(
            tenant=self.tenant,
            recipient=self.user_a,
            notification_type=Notification.NotificationType.SHIPMENT_ASSIGNED,
            title="Order TRK001 Assigned",
            message="You have a new assignment",
        )

        client = APIClient()
        client.force_authenticate(user=self.user_a)

        # Call via public API host where request.tenant is None
        res = client.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["unread_count"], 1)
        self.assertEqual(res.data["results"][0]["id"], notif.id)
        self.assertEqual(res.data["results"][0]["title"], "Order TRK001 Assigned")

    def test_notification_mark_read_and_read_all_via_public_host(self):
        """
        Regression Test: Mark notification read & read-all via public API host.
        """
        notif = NotificationService.create(
            tenant=self.tenant,
            recipient=self.user_a,
            notification_type=Notification.NotificationType.DELAY_ALERT,
            title="Shipment Delay",
            message="Traffic delay",
        )

        client = APIClient()
        client.force_authenticate(user=self.user_a)

        # Mark single as read
        read_url = reverse("notification-read", kwargs={"pk": notif.id})
        res_read = client.patch(read_url, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_read.status_code, 200)
        self.assertTrue(res_read.data["is_read"])

        # Mark all as read
        read_all_url = reverse("notifications-read-all")
        res_all = client.patch(read_all_url, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_all.status_code, 200)

    def test_tenant_isolation_for_notifications(self):
        """
        Regression Test: User A cannot see User B's notifications, and unaffiliated users cannot see notifications.
        """
        # Create notification for User A
        notif_a = NotificationService.create(
            tenant=self.tenant,
            recipient=self.user_a,
            notification_type=Notification.NotificationType.SHIPMENT_STATUS,
            title="User A Notification",
            message="For User A only",
        )

        # Create notification for User B
        notif_b = NotificationService.create(
            tenant=self.tenant,
            recipient=self.user_b,
            notification_type=Notification.NotificationType.SHIPMENT_STATUS,
            title="User B Notification",
            message="For User B only",
        )

        # User A views notifications -> only sees notif_a
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        res_a = client_a.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_a.status_code, 200)
        self.assertEqual(res_a.data["count"], 1)
        self.assertEqual(res_a.data["results"][0]["id"], notif_a.id)

        # User B views notifications -> only sees notif_b
        client_b = APIClient()
        client_b.force_authenticate(user=self.user_b)
        res_b = client_b.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_b.status_code, 200)
        self.assertEqual(res_b.data["count"], 1)
        self.assertEqual(res_b.data["results"][0]["id"], notif_b.id)

        # User A attempts to mark User B's notification as read -> 404
        read_url_b = reverse("notification-read", kwargs={"pk": notif_b.id})
        res_cross = client_a.patch(read_url_b, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_cross.status_code, 404)

        # Unaffiliated user (no workspace) views notifications -> returns empty
        client_unaffiliated = APIClient()
        client_unaffiliated.force_authenticate(user=self.unaffiliated_user)
        res_unaff = client_unaffiliated.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res_unaff.status_code, 200)
        self.assertEqual(res_unaff.data["count"], 0)
        self.assertEqual(res_unaff.data["results"], [])

    def test_notifications_jwt_claim_active_user_tenant_allowed(self):
        """Regression Test: Valid JWT claim + active UserTenant allows querying notifications."""
        from apps.authentication.services import generate_tokens

        NotificationService.create(
            tenant=self.tenant,
            recipient=self.user_a,
            notification_type=Notification.NotificationType.SHIPMENT_STATUS,
            title="JWT Active Notification",
            message="JWT active test",
        )

        tokens = generate_tokens(self.user_a, tenant=self.tenant)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_notifications_jwt_claim_inactive_user_tenant_rejected(self):
        """Regression Test: Valid JWT claim + inactive UserTenant returns empty notifications."""
        from apps.authentication.services import generate_tokens

        user_inactive = User.objects.create_user(
            username="notif_inactive@test.com",
            email="notif_inactive@test.com",
            phone="9876540001",
        )
        UserTenant.objects.create(user=user_inactive, tenant=self.tenant, is_active=False)

        tokens = generate_tokens(user_inactive, tenant=self.tenant)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)
        self.assertEqual(res.data["results"], [])

    def test_notifications_jwt_claim_mismatched_tenant_rejected(self):
        """Regression Test: JWT claim for Tenant B while user only belongs to Tenant A is rejected."""
        from apps.authentication.services import generate_tokens
        from apps.tenants.models import Client
        from django_tenants.utils import schema_context

        with schema_context("public"):
            tenant_b = Client.objects.create(
                schema_name="notifbeta",
                name="NotifBeta",
                email="beta@notif.com",
                phone="9876540099",
                status="approved",
                verified=True,
            )

        tokens = generate_tokens(self.user_a, tenant=tenant_b)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = client.get(reverse("notification-list"), HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 0)
        self.assertEqual(res.data["results"], [])

        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM tenants_client WHERE schema_name='notifbeta'")

