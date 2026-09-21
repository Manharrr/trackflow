from django_tenants.test.cases import TenantTestCase
from django.contrib.auth import get_user_model, authenticate
from apps.tenants.models import UserTenant
from apps.employees.models.employee import Employee, Role
from apps.employees.models.activation import AccountActivation
from apps.employees.services.onboarding_service import EmployeeOnboardingService
from apps.employees.services.activation_service import ActivationService
from django.core import mail

User = get_user_model()


class EmployeeOnboardingFlowTestCase(TenantTestCase):

    @classmethod
    def setup_tenant(cls, tenant):
        # Configure required tenant fields for test
        tenant.name = "TrackFlow Test Tenant"
        tenant.email = "admin@trackflow.test"
        tenant.phone = "1234567890"
        tenant.verified = True
        tenant.status = "approved"

    @classmethod
    def setUpClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        from apps.tenants.models import Domain
        Domain.objects.filter(domain="tenant.test.com").delete()
        super().setUpClass()
        # Explicitly create schema and run tenant migrations since auto_create_schema is False on Client
        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            'migrate_schemas',
            schema_name=cls.tenant.schema_name,
            interactive=False,
            verbosity=0
        )
        # Restore the connection's active tenant context, because create_schema switches it to public!
        from django.db import connection
        connection.set_tenant(cls.tenant)

    @classmethod
    def tearDownClass(cls):
        # Safely clean up domains and settings. Bypassing tenant.delete() prevents
        # the Cascade UndefinedTable error because the test DB is destroyed at the end anyway.
        from django.db import connection
        connection.set_schema_to_public()
        try:
            cls.domain.delete()
        except Exception:
            pass
        from apps.tenants.models import Domain
        Domain.objects.filter(domain="tenant.test.com").delete()
        cls.remove_allowed_test_domain()


    def setUp(self):
        from django.db import connection
        connection.set_tenant(self.tenant)
        super().setUp()

        # Create a Company Admin User
        self.admin_user = User.objects.create_user(
            username="admin@trackflow.test",
            email="admin@trackflow.test",
            phone="9876543210",
            password="adminpassword123",
        )
        self.admin_user.is_verified = True
        self.admin_user.save()

        # Create UserTenant mapping for admin
        self.user_tenant = UserTenant.objects.create(
            user=self.admin_user,
            tenant=self.tenant,
            is_active=True,
        )

        # Create Employee profile for admin
        self.admin_employee = Employee.objects.create(
            tenant=self.tenant,
            user=self.admin_user,
            role=Role.COMPANY_ADMIN,
            full_name="Workspace Admin",
            email=self.admin_user.email,
            phone=self.admin_user.phone,
        )

    def tearDown(self):
        from django.db import connection
        connection.set_tenant(self.tenant)
        super().tearDown()

    def test_complete_onboarding_activation_and_login_flow(self):
        # Test Onboarding creation
        employee_email = "employee@trackflow.test"
        employee_phone = "1112223333"
        employee_name = "John Doe"

        # Check there is no mail sent initially
        self.assertEqual(len(mail.outbox), 0)

        # Step 1: Onboard Employee (Company Admin creates employee)
        employee = EmployeeOnboardingService.create_employee(
            tenant=self.tenant,
            full_name=employee_name,
            email=employee_email,
            phone=employee_phone,
            role=Role.EMPLOYEE,
            department="Engineering",
            designation="Software Engineer",
            manager=self.admin_employee,
        )

        # Verify Employee is created correctly
        self.assertEqual(employee.full_name, employee_name)
        self.assertEqual(employee.email, employee_email)
        self.assertEqual(employee.phone, employee_phone)
        self.assertEqual(employee.role, Role.EMPLOYEE)
        self.assertEqual(employee.manager, self.admin_employee)
        self.assertTrue(employee.first_login)

        # Verify User was created immediately with unusable password and is not verified
        user = employee.user
        self.assertEqual(user.email, employee_email)
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.is_verified)

        # Verify UserTenant mapping was created
        user_tenant_exists = UserTenant.objects.filter(user=user, tenant=self.tenant).exists()
        self.assertTrue(user_tenant_exists)

        # Verify AccountActivation token is created
        activation = AccountActivation.objects.get(user=user)
        self.assertFalse(activation.is_used)

        # Verify Activation email is dispatched
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, [employee_email])
        self.assertIn("Welcome to TrackFlow AI", sent_email.subject)
        self.assertIn(str(activation.token), sent_email.body)

        # Step 2: Verify activation token
        verified_activation = ActivationService.verify_token(activation.token)
        self.assertEqual(verified_activation.id, activation.id)

        # Step 3: Employee sets password and activates account
        new_password = "secureemployeepassword123"
        activated_user = ActivationService.activate_account(activation.token, new_password)

        # Verify user is verified and has usable password
        self.assertEqual(activated_user.id, user.id)
        self.assertTrue(activated_user.is_verified)
        self.assertTrue(activated_user.has_usable_password())

        # Verify token is marked as used
        activation.refresh_from_db()
        self.assertTrue(activation.is_used)

        # Step 4: Login works (using custom backend 'email' keyword argument)
        authenticated_user = authenticate(email=employee_email, password=new_password)
        self.assertIsNotNone(authenticated_user)
        self.assertEqual(authenticated_user.id, user.id)

    def test_employee_crud_and_status_endpoints(self):
        from rest_framework.test import APIClient
        from django.urls import reverse

        client = APIClient()
        client.force_authenticate(user=self.admin_user)
        host = self.tenant.domains.first().domain

        # Test GET employee list
        url = reverse("employee-list")
        response = client.get(url, HTTP_HOST=host)
        self.assertEqual(response.status_code, 200)

        # Test POST employee create
        create_url = reverse("employee-create")
        data = {
            "full_name": "Test Driver",
            "email": "driver@trackflow.test",
            "phone": "9998887777",
            "role": Role.EMPLOYEE,
            "department": "Delivery",
            "designation": "Courier Executive",
            "address": "123 Main St",
        }
        res = client.post(create_url, data, HTTP_HOST=host)
        self.assertEqual(res.status_code, 201)
        self.assertIn("employee_code", res.data["data"])
        employee_id = res.data["data"]["id"]

        # Test GET employee detail
        detail_url = reverse("employee-detail", kwargs={"employee_id": employee_id})
        res_detail = client.get(detail_url, HTTP_HOST=host)
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.data["employee_code"], "TF-EMP-0002")

        # Test PATCH update employee
        update_url = reverse("employee-update", kwargs={"employee_id": employee_id})
        res_update = client.patch(update_url, {"full_name": "Test Driver Updated"}, HTTP_HOST=host)
        self.assertEqual(res_update.status_code, 200)

        # Test POST deactivate employee
        deactivate_url = reverse("employee-deactivate", kwargs={"employee_id": employee_id})
        res_deact = client.post(deactivate_url, HTTP_HOST=host)
        self.assertEqual(res_deact.status_code, 200)

        # Verify inactive status in database
        emp = Employee.objects.get(id=employee_id)
        self.assertFalse(emp.is_active)

        # Test POST activate employee
        activate_url = reverse("employee-activate", kwargs={"employee_id": employee_id})
        res_act = client.post(activate_url, HTTP_HOST=host)
        self.assertEqual(res_act.status_code, 200)

        # Verify active status in database
        emp.refresh_from_db()
        self.assertTrue(emp.is_active)

        # Test GET dashboard view for the employee user
        client.force_authenticate(user=emp.user)
        dashboard_url = reverse("employee-dashboard")
        res_dash = client.get(dashboard_url, HTTP_HOST=host)
        self.assertEqual(res_dash.status_code, 200)
        self.assertEqual(res_dash.data["employee_name"], "Test Driver Updated")
        self.assertGreater(res_dash.data["profile_completion"], 0)

        # Test GET profile view
        profile_url = reverse("employee-profile")
        res_prof = client.get(profile_url, HTTP_HOST=host)
        self.assertEqual(res_prof.status_code, 200)

        # Test PATCH update own profile
        res_prof_patch = client.patch(profile_url, {"address": "New Driver Address"}, HTTP_HOST=host)
        self.assertEqual(res_prof_patch.status_code, 200)
        emp.refresh_from_db()
        self.assertEqual(emp.address, "New Driver Address")

    def test_company_admin_create_via_public_api_host(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from django_tenants.utils import schema_context

        client = APIClient()
        client.force_authenticate(user=self.admin_user)
        create_url = reverse("employee-create")

        payload = {
            "full_name": "Public API Worker",
            "email": "public_api_worker@trackflow.test",
            "phone": "9991112233",
            "role": Role.EMPLOYEE,
            "department": "Logistics",
            "designation": "Dispatcher",
        }

        # Calling through the public API hostname triggers TrackFlowTenantMiddleware
        # which sets request.tenant = None and switches connection schema to public.
        res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["message"], "Employee created successfully.")
        self.assertEqual(res.data["data"]["email"], "public_api_worker@trackflow.test")

        # Verify employee was created in tenant schema
        with schema_context(self.tenant.schema_name):
            created_emp = Employee.objects.filter(email="public_api_worker@trackflow.test").first()
            self.assertIsNotNone(created_emp)
            self.assertEqual(created_emp.role, Role.EMPLOYEE)
            self.assertEqual(created_emp.tenant_id, self.tenant.id)

    def test_non_company_admin_rejected_403(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from django_tenants.utils import schema_context

        # Create a regular employee user
        regular_user = User.objects.create_user(
            username="regular_worker@trackflow.test",
            email="regular_worker@trackflow.test",
            phone="8881112233",
            password="password123",
        )
        UserTenant.objects.create(
            user=regular_user,
            tenant=self.tenant,
            is_active=True,
        )
        with schema_context(self.tenant.schema_name):
            Employee.objects.create(
                tenant=self.tenant,
                user=regular_user,
                role=Role.EMPLOYEE,
                full_name="Regular Worker",
                email=regular_user.email,
                phone=regular_user.phone,
            )

        client = APIClient()
        client.force_authenticate(user=regular_user)
        create_url = reverse("employee-create")

        payload = {
            "full_name": "Subordinate Worker",
            "email": "subordinate@trackflow.test",
            "phone": "8882223344",
            "role": Role.EMPLOYEE,
        }

        res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data.get("detail"), "Only Company Admin can perform this action.")

    def test_inactive_user_tenant_rejected_403(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from django_tenants.utils import schema_context

        with schema_context('public'):
            self.user_tenant.is_active = False
            self.user_tenant.save()

        try:
            client = APIClient()
            client.force_authenticate(user=self.admin_user)
            create_url = reverse("employee-create")

            payload = {
                "full_name": "Denied Worker",
                "email": "denied@trackflow.test",
                "phone": "7771112233",
                "role": Role.EMPLOYEE,
            }

            res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.data.get("detail"), "Only Company Admin can perform this action.")
        finally:
            with schema_context('public'):
                self.user_tenant.is_active = True
                self.user_tenant.save()

    def test_blocked_employee_rejected_403(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from django_tenants.utils import schema_context

        with schema_context(self.tenant.schema_name):
            Employee.objects.filter(id=self.admin_employee.id).update(is_blocked=True)

        try:
            client = APIClient()
            client.force_authenticate(user=self.admin_user)
            create_url = reverse("employee-create")

            payload = {
                "full_name": "Blocked Worker",
                "email": "blocked@trackflow.test",
                "phone": "6661112233",
                "role": Role.EMPLOYEE,
            }

            res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.data.get("detail"), "Only Company Admin can perform this action.")
        finally:
            with schema_context(self.tenant.schema_name):
                Employee.objects.filter(id=self.admin_employee.id).update(is_blocked=False)

    def test_inactive_employee_rejected_403(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from django_tenants.utils import schema_context

        with schema_context(self.tenant.schema_name):
            Employee.objects.filter(id=self.admin_employee.id).update(is_active=False)

        try:
            client = APIClient()
            client.force_authenticate(user=self.admin_user)
            create_url = reverse("employee-create")

            payload = {
                "full_name": "Inactive Admin Worker",
                "email": "inactiveadmin@trackflow.test",
                "phone": "5551112233",
                "role": Role.EMPLOYEE,
            }

            res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.data.get("detail"), "Only Company Admin can perform this action.")
        finally:
            with schema_context(self.tenant.schema_name):
                Employee.objects.filter(id=self.admin_employee.id).update(is_active=True)

    def test_tenant_isolation_and_schema_scoping(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from apps.tenants.models import Client
        from django_tenants.utils import schema_context

        # Create another tenant that the user does NOT belong to (must be created in public schema)
        with schema_context('public'):
            foreign_tenant = Client.objects.create(
                schema_name="foreigntest",
                name="Foreign Tenant",
                email="foreign@test.com",
                phone="0009998877",
                status="approved",
                verified=True,
            )

        client = APIClient()
        # User authenticated, but simulate a token claim claiming a foreign tenant
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.admin_user)
        refresh["schema_name"] = "foreigntest"
        access_token = str(refresh.access_token)

        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        create_url = reverse("employee-create")

        payload = {
            "full_name": "Intruder Worker",
            "email": "intruder@trackflow.test",
            "phone": "4440001122",
            "role": Role.EMPLOYEE,
        }

        # Since user has no UserTenant for foreigntest, resolve_request_tenant returns None
        res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data.get("detail"), "Only Company Admin can perform this action.")

    def test_superuser_behavior_preserved(self):
        from rest_framework.test import APIClient
        from django.urls import reverse

        super_user = User.objects.create_user(
            username="superuser@trackflow.test",
            email="superuser@trackflow.test",
            phone="3330001122",
            password="superpassword123",
        )
        super_user.is_superuser = True
        super_user.is_staff = True
        super_user.save()

        UserTenant.objects.create(
            user=super_user,
            tenant=self.tenant,
            is_active=True,
        )

        client = APIClient()
        client.force_authenticate(user=super_user)
        create_url = reverse("employee-create")

        payload = {
            "full_name": "Superuser Onboarded",
            "email": "superonboarded@trackflow.test",
            "phone": "2220001122",
            "role": Role.EMPLOYEE,
            "department": "Executive",
            "designation": "Associate",
        }

        res = client.post(create_url, payload, HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["data"]["email"], "superonboarded@trackflow.test")

    def tearDown(self):
        from django.db import connection
        connection.set_tenant(self.tenant)
        super().tearDown()

    def test_employee_list_via_public_api_host(self):
        """Regression Test: GET /api/employees/?page=1 on api.manhargurukkal.site returns 200."""
        from rest_framework.test import APIClient
        from django.urls import reverse

        client = APIClient()
        client.force_authenticate(user=self.admin_user)
        list_url = reverse("employee-list")
        res = client.get(f"{list_url}?page=1", HTTP_HOST="api.manhargurukkal.site")
        self.assertEqual(res.status_code, 200)
        self.assertIn("results", res.data)
        self.assertGreaterEqual(len(res.data["results"]), 1)
