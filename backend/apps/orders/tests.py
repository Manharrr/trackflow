from django_tenants.test.cases import TenantTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.tenants.models import UserTenant
from apps.employees.models import Employee, Role
from apps.orders.models.order import Order, OrderStatus, OrderPriority
from apps.orders.models.attempt import DeliveryAttempt
from apps.orders.models.audit import OrderAuditLog
from apps.orders.services.order_service import OrderService
from apps.orders.services.assignment_service import AssignmentService
from apps.orders.services.status_service import StatusService

User = get_user_model()


class OrdersTestCase(TenantTestCase):

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "TrackFlow Test Tenant"
        tenant.email = "admin@trackflow.test"
        tenant.phone = "1234567890"
        tenant.verified = True
        tenant.status = "approved"

    @classmethod
    def setUpClass(cls):
        # Clean up pre-existing test schemas using raw SQL to bypass ORM cascade relation checks
        from django.db import connection
        with connection.cursor() as cursor:
            try:
                cursor.execute("DELETE FROM tenants_domain WHERE domain='test.test.com'")
                cursor.execute("DELETE FROM tenants_client WHERE schema_name='test'")
            except Exception:
                pass
        
        super().setUpClass()
        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            'migrate_schemas',
            schema_name=cls.tenant.schema_name,
            interactive=False,
            verbosity=0
        )
        from django.db import connection
        connection.set_tenant(cls.tenant)

    @classmethod
    def tearDownClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        with connection.cursor() as cursor:
            try:
                cursor.execute("DELETE FROM tenants_domain WHERE domain='test.test.com'")
                cursor.execute("DELETE FROM tenants_client WHERE schema_name='test'")
                cursor.execute("DELETE FROM tenants_client WHERE schema_name='otherco'")
            except Exception:
                pass
        # Skip super().tearDownClass() to prevent cascade checks in public schema context

    def setUp(self):
        super().setUp()
        
        # 1. Create OM / Admin User
        self.admin_user = User.objects.create_user(
            username="admin@trackflow.test",
            email="admin@trackflow.test",
            phone="1234567890",
        )
        self.admin_user.is_verified = True
        self.admin_user.save()

        # Workspace mapping
        UserTenant.objects.create(
            user=self.admin_user,
            tenant=self.tenant,
            is_active=True,
        )

        # Employee profile for admin (Operations Manager role)
        self.admin_employee = Employee.objects.create(
            tenant=self.tenant,
            user=self.admin_user,
            role=Role.OPERATIONS_MANAGER,
            full_name="OM Admin",
            email="admin@trackflow.test",
            phone="1234567890",
        )

        # 2. Create Delivery Partner Driver
        self.driver_user = User.objects.create_user(
            username="driver@trackflow.test",
            email="driver@trackflow.test",
            phone="9998887777",
        )
        self.driver_user.is_verified = True
        self.driver_user.save()

        UserTenant.objects.create(
            user=self.driver_user,
            tenant=self.tenant,
            is_active=True,
        )

        self.driver_employee = Employee.objects.create(
            tenant=self.tenant,
            user=self.driver_user,
            role=Role.EMPLOYEE,
            full_name="John Driver",
            email="driver@trackflow.test",
            phone="9998887777",
        )

    def test_tracking_id_generation(self):
        # Generate tracking IDs sequentially
        order1 = OrderService.create_order(
            tenant=self.tenant,
            OM_user=self.admin_user,
            data={
                "customer_name": "Cust 1",
                "customer_phone": "1112223333",
                "pickup_address": "Pickup 1",
                "delivery_address": "Delivery 1",
            }
        )
        order2 = OrderService.create_order(
            tenant=self.tenant,
            OM_user=self.admin_user,
            data={
                "customer_name": "Cust 2",
                "customer_phone": "2223334444",
                "pickup_address": "Pickup 2",
                "delivery_address": "Delivery 2",
            }
        )

        self.assertEqual(order1.tracking_id, "TRK000001")
        self.assertEqual(order2.tracking_id, "TRK000002")

    def test_state_transitions(self):
        order = OrderService.create_order(
            tenant=self.tenant,
            OM_user=self.admin_user,
            data={
                "customer_name": "Cust 1",
                "customer_phone": "1112223333",
                "pickup_address": "Pickup 1",
                "delivery_address": "Delivery 1",
            }
        )

        # Valid transition: Pending -> Assigned
        AssignmentService.assign_order(
            order=order,
            employee=self.driver_employee,
            assigned_by=self.admin_user,
        )
        self.assertEqual(order.status, OrderStatus.ASSIGNED)

        # Valid transition: Assigned -> Picked Up
        StatusService.update_status(
            order=order,
            new_status=OrderStatus.PICKED_UP,
            user=self.driver_user,
        )
        self.assertEqual(order.status, OrderStatus.PICKED_UP)

        # Valid transition: Picked Up -> In Transit
        StatusService.update_status(
            order=order,
            new_status=OrderStatus.IN_TRANSIT,
            user=self.driver_user,
        )
        self.assertEqual(order.status, OrderStatus.IN_TRANSIT)

        # Valid transition: In Transit -> Out For Delivery
        StatusService.update_status(
            order=order,
            new_status=OrderStatus.OUT_FOR_DELIVERY,
            user=self.driver_user,
        )
        self.assertEqual(order.status, OrderStatus.OUT_FOR_DELIVERY)

        # Terminal state Delivered
        StatusService.update_status(
            order=order,
            new_status=OrderStatus.DELIVERED,
            user=self.driver_user,
        )
        self.assertEqual(order.status, OrderStatus.DELIVERED)

        # Invalid transition: Delivered -> Pending (raises ValidationError)
        with self.assertRaises(ValidationError):
            StatusService.update_status(
                order=order,
                new_status=OrderStatus.PENDING,
                user=self.driver_user,
            )

    def test_multi_tenant_boundary_assignment(self):
        # Create an employee belonging to another tenant
        from apps.tenants.models import Client
        from django.db import connection
        
        connection.set_schema_to_public()
        other_tenant = Client.objects.create(
            schema_name="otherco",
            name="Other Company",
            email="info@other.com",
            phone="1234512345",
            verified=True,
            status="approved"
        )
        other_tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            'migrate_schemas',
            schema_name=other_tenant.schema_name,
            interactive=False,
            verbosity=0
        )

        connection.set_tenant(other_tenant)
        other_user = User.objects.create_user(
            username="other@other.com",
            email="other@other.com",
            phone="8887776666",
        )
        other_employee = Employee.objects.create(
            tenant=other_tenant,
            user=other_user,
            role=Role.EMPLOYEE,
            full_name="Foreign Courier",
            email="other@other.com",
            phone="8887776666",
        )

        connection.set_tenant(self.tenant)

        order = OrderService.create_order(
            tenant=self.tenant,
            OM_user=self.admin_user,
            data={
                "customer_name": "Cust 1",
                "customer_phone": "1112223333",
                "pickup_address": "Pickup 1",
                "delivery_address": "Delivery 1",
            }
        )

        # Attempt to assign foreign courier should raise ValidationError
        with self.assertRaises(ValidationError):
            AssignmentService.assign_order(
                order=order,
                employee=other_employee,
                assigned_by=self.admin_user,
            )

    def test_soft_delete_and_restore(self):
        order = OrderService.create_order(
            tenant=self.tenant,
            OM_user=self.admin_user,
            data={
                "customer_name": "Cust 1",
                "customer_phone": "1112223333",
                "pickup_address": "Pickup 1",
                "delivery_address": "Delivery 1",
            }
        )

        # Soft delete
        OrderService.soft_delete_order(order=order, user=self.admin_user)
        self.assertTrue(order.is_deleted)
        self.assertIsNotNone(order.deleted_at)

        # Restore
        OrderService.restore_order(order=order, user=self.admin_user)
        self.assertFalse(order.is_deleted)
        self.assertNull = getattr(order, "deleted_at", None)
        self.assertEqual(order.deleted_at, None)

    def test_endpoints_responses(self):
        client = APIClient()
        client.force_authenticate(user=self.admin_user)
        host = self.tenant.domains.first().domain

        # Create Order via POST API
        create_url = reverse("order-create")
        payload = {
            "customer_name": "Jane Customer",
            "customer_phone": "+9198765432",
            "customer_email": "jane@customer.com",
            "pickup_address": "A-12 Regional Hub",
            "delivery_address": "Flat 304, Green Meadows",
            "priority": OrderPriority.HIGH,
            "expected_delivery_date": str(timezone.now() + timezone.timedelta(days=2)),
        }
        res_post = client.post(create_url, payload, HTTP_HOST=host)
        self.assertEqual(res_post.status_code, 201)
        order_id = res_post.data["data"]["id"]

        # View details via GET API
        detail_url = reverse("order-detail", kwargs={"order_id": order_id})
        res_get = client.get(detail_url, HTTP_HOST=host)
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.data["customer_name"], "Jane Customer")
        self.assertEqual(res_get.data["internal_notes"], "")

        # Bulk assign orders POST API
        bulk_url = reverse("order-bulk-assign")
        bulk_payload = {
            "order_ids": [order_id],
            "employee_id": str(self.driver_employee.id)
        }
        res_bulk = client.post(bulk_url, bulk_payload, HTTP_HOST=host)
        self.assertEqual(res_bulk.status_code, 200)
        self.assertEqual(len(res_bulk.data["data"]), 1)

        # Timeline API check
        timeline_url = reverse("order-timeline", kwargs={"order_id": order_id})
        res_time = client.get(timeline_url, HTTP_HOST=host)
        self.assertEqual(res_time.status_code, 200)
        self.assertGreater(len(res_time.data), 0)

        # Dashboard API check
        dash_url = reverse("order-dashboard")
        res_dash = client.get(dash_url, HTTP_HOST=host)
        self.assertEqual(res_dash.status_code, 200)
        self.assertEqual(res_dash.data["role"], "operations_manager")
        self.assertGreater(res_dash.data["assigned"], 0)

    def test_operations_dashboard_endpoints(self):
        client = APIClient()
        host = self.tenant.domains.first().domain

        # Authenticate as OM (Authorized)
        client.force_authenticate(user=self.admin_user)
        
        # Test main dashboard endpoint
        res_dash = client.get(reverse("operations-dashboard"), HTTP_HOST=host)
        self.assertEqual(res_dash.status_code, 200)
        self.assertIn("summary_cards", res_dash.data)
        self.assertIn("performance_metrics", res_dash.data)

        # Test team overview endpoint
        res_team = client.get(reverse("operations-team-overview"), HTTP_HOST=host)
        self.assertEqual(res_team.status_code, 200)
        self.assertIn("total_delivery_partners", res_team.data)
        self.assertIn("available", res_team.data)

        # Test leaderboard endpoint
        res_leader = client.get(reverse("operations-leaderboard"), HTTP_HOST=host)
        self.assertEqual(res_leader.status_code, 200)
        self.assertIsInstance(res_leader.data, list)

        # Test charts endpoint
        res_charts = client.get(reverse("operations-charts"), HTTP_HOST=host)
        self.assertEqual(res_charts.status_code, 200)
        self.assertIn("status_distribution", res_charts.data)
        self.assertIn("trends", res_charts.data)

        # Authenticate as Driver (Forbidden Role)
        client.force_authenticate(user=self.driver_user)
        res_forbidden = client.get(reverse("operations-dashboard"), HTTP_HOST=host)
        self.assertEqual(res_forbidden.status_code, 403)

