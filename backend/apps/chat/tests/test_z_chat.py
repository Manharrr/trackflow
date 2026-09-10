from django.test import TestCase
from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.tenants.models import Client, UserTenant
from apps.employees.models.employee import Employee, Role
from apps.chat.models.conversation import Conversation
from apps.chat.models.message import Message, MessageType
from apps.chat.services.conversation_service import ConversationService
from apps.chat.services.message_service import MessageService

User = get_user_model()


class ChatFlowTestCase(TestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # 1. Create a isolated client tenant for chat tests
        cls.tenant, _ = Client.objects.get_or_create(
            schema_name="chatschema",
            defaults={
                "name": "Chat Test Tenant",
                "email": "chatadmin@trackflow.test",
                "phone": "1234567890",
                "verified": True,
                "status": "approved",
            }
        )

        # 2. Create the associated domain record
        from apps.tenants.models import Domain
        cls.domain, _ = Domain.objects.get_or_create(
            domain="chatschema.test.com",
            tenant=cls.tenant,
            defaults={"is_primary": True}
        )

        # 3. Apply schema creation and migrations manually
        cls.tenant.create_schema(check_if_exists=True)
        from django.core.management import call_command
        call_command(
            "migrate_schemas",
            schema_name="chatschema",
            interactive=False,
            verbosity=0
        )

    @classmethod
    def tearDownClass(cls):
        from django.db import connection
        connection.set_schema_to_public()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        # Set active tenant context on the database connection
        connection.set_tenant(self.tenant)
        # Force the search path to lookup from both the chat test schema and public tables
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO chatschema, public")

        # Create test users with unique details to avoid collisions
        self.admin_user = User.objects.create_user(
            username="chat_admin@test.com", email="chat_admin@test.com", phone="999111", password="password123"
        )
        self.manager_user = User.objects.create_user(
            username="chat_manager@test.com", email="chat_manager@test.com", phone="999222", password="password123"
        )
        self.driver_user = User.objects.create_user(
            username="chat_driver@test.com", email="chat_driver@test.com", phone="999333", password="password123"
        )
        self.other_driver_user = User.objects.create_user(
            username="chat_other_driver@test.com", email="chat_other_driver@test.com", phone="999444", password="password123"
        )

        # Map users to tenant client
        UserTenant.objects.create(user=self.admin_user, tenant=self.tenant)
        UserTenant.objects.create(user=self.manager_user, tenant=self.tenant)
        UserTenant.objects.create(user=self.driver_user, tenant=self.tenant)
        UserTenant.objects.create(user=self.other_driver_user, tenant=self.tenant)

        # Create active employee profiles inside tenant schema
        self.admin_emp = Employee.objects.create(
            user=self.admin_user, tenant=self.tenant, role=Role.COMPANY_ADMIN,
            full_name="Admin User", email=self.admin_user.email, phone="111"
        )
        self.manager_emp = Employee.objects.create(
            user=self.manager_user, tenant=self.tenant, role=Role.OPERATIONS_MANAGER,
            full_name="Manager User", email=self.manager_user.email, phone="222"
        )
        self.driver_emp = Employee.objects.create(
            user=self.driver_user, tenant=self.tenant, role=Role.EMPLOYEE,
            full_name="Driver User", email=self.driver_user.email, phone="333",
            manager=self.manager_emp
        )
        self.other_driver_emp = Employee.objects.create(
            user=self.other_driver_user, tenant=self.tenant, role=Role.EMPLOYEE,
            full_name="Other Driver User", email=self.other_driver_user.email, phone="444"
        )

        self.client = APIClient()

    def test_conversation_creation_role_restrictions(self):
        # Admin can chat with anyone
        conv, created = ConversationService.get_or_create_conversation(
            tenant=self.tenant, participant_one=self.admin_user, participant_two=self.driver_user
        )
        self.assertTrue(created)
        self.assertEqual(conv.participant_one, min(self.admin_user, self.driver_user, key=lambda u: str(u.id)))

        # Driver can chat with their assigned manager
        conv2, created2 = ConversationService.get_or_create_conversation(
            tenant=self.tenant, participant_one=self.driver_user, participant_two=self.manager_user
        )
        self.assertTrue(created2)

        # Driver CANNOT chat with unassigned manager or other driver
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            ConversationService.get_or_create_conversation(
                tenant=self.tenant, participant_one=self.driver_user, participant_two=self.other_driver_user
            )

    def test_message_creation_and_unread_counts(self):
        # Setup conversation
        conv, _ = ConversationService.get_or_create_conversation(
            tenant=self.tenant, participant_one=self.admin_user, participant_two=self.driver_user
        )

        # Send message
        msg = MessageService.create_message(
            conversation=conv, sender=self.admin_user, message="Hello Driver!"
        )
        self.assertEqual(msg.message, "Hello Driver!")
        self.assertEqual(msg.message_type, MessageType.TEXT)

        # Verify unread counts
        self.assertEqual(MessageService.get_unread_count(conv, self.driver_user), 1)
        self.assertEqual(MessageService.get_unread_count(conv, self.admin_user), 0)

        # Mark as read
        updated_count = MessageService.mark_as_read(conv, self.driver_user)
        self.assertEqual(updated_count, 1)
        self.assertEqual(MessageService.get_unread_count(conv, self.driver_user), 0)

    def test_chat_rest_api_endpoints(self):
        self.client.force_authenticate(user=self.admin_user)
        domain = self.tenant.domains.first().domain

        # Create conversation via REST POST
        response = self.client.post(
            "/api/chat/conversations/create/",
            {"participant_id": self.driver_user.id},
            format="json",
            HTTP_HOST=domain
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conversation_id = response.data["id"]

        # List conversations
        response_list = self.client.get(
            "/api/chat/conversations/",
            format="json",
            HTTP_HOST=domain
        )
        self.assertEqual(response_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_list.data), 1)

        # Post message
        response_msg = self.client.post(
            "/api/chat/messages/",
            {
                "conversation_id": conversation_id,
                "message": "Hello from REST API!",
                "message_type": "text"
            },
            format="json",
            HTTP_HOST=domain
        )
        self.assertEqual(response_msg.status_code, status.HTTP_201_CREATED)

        # Get messages in conversation
        response_msgs = self.client.get(
            f"/api/chat/conversations/{conversation_id}/messages/",
            format="json",
            HTTP_HOST=domain
        )
        self.assertEqual(response_msgs.status_code, status.HTTP_200_OK)
        self.assertEqual(response_msgs.data["count"], 1)

    def test_websocket_channels_middleware_authentication(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.admin_user))

        scope = {
            "type": "websocket",
            "headers": [(b"host", b"chatschema.test.com")],
            "query_string": f"token={token}".encode("utf-8"),
        }

        from apps.chat.middleware.tenant_channels_middleware import get_tenant_and_user

        tenant, user = get_tenant_and_user.func(scope)
        self.assertEqual(tenant, self.tenant)
        self.assertEqual(user, self.admin_user)

    def test_websocket_channels_middleware_unauthorized_rejection(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.other_driver_user))

        conv, _ = ConversationService.get_or_create_conversation(
            tenant=self.tenant, participant_one=self.admin_user, participant_two=self.driver_user
        )

        scope = {
            "type": "websocket",
            "headers": [(b"host", b"chatschema.test.com")],
            "query_string": f"token={token}".encode("utf-8"),
            "url_route": {"kwargs": {"conversation_id": str(conv.id)}},
        }

        from apps.chat.middleware.tenant_channels_middleware import get_tenant_and_user

        # Let's test with a fake token or a token for a user that doesn't have a mapping:
        fake_user = User.objects.create_user(
            username="fake_user@test.com", email="fake_user@test.com", phone="999888", password="password123"
        )
        fake_token = str(AccessToken.for_user(fake_user))

        unauthorized_scope = {
            "type": "websocket",
            "headers": [(b"host", b"chatschema.test.com")],
            "query_string": f"token={fake_token}".encode("utf-8"),
        }

        tenant, user = get_tenant_and_user.func(unauthorized_scope)
        self.assertTrue(user.is_anonymous)

