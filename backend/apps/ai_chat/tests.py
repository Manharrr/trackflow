from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient


class ChatbotAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("apps.ai_chat.views.ask_ai")
    def test_chatbot_endpoint_success(self, mock_ask_ai):
        mock_ask_ai.return_value = {
            "answer": "TrackFlow is a logistics platform.",
            "retrieved_context": None,
        }

        response = self.client.post(
            "/api/chatbot/",
            {
                "question": "What is TrackFlow?",
                "tenant_id": None,
                "history": [],
                "is_public": True,
            },
            format="json",
            HTTP_HOST="api.manhargurukkal.site",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["answer"], "TrackFlow is a logistics platform.")
        mock_ask_ai.assert_called_once_with(
            question="What is TrackFlow?",
            tenant_id=None,
            history=[],
            is_public=True,
        )

    @patch("apps.ai_chat.views.ask_ai")
    def test_chatbot_double_api_alias_endpoint_success(self, mock_ask_ai):
        mock_ask_ai.return_value = {
            "answer": "Alias works cleanly.",
            "retrieved_context": None,
        }

        response = self.client.post(
            "/api/api/chatbot/",
            {
                "question": "hello",
                "tenant_id": None,
                "history": [],
                "is_public": True,
            },
            format="json",
            HTTP_HOST="api.manhargurukkal.site",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["answer"], "Alias works cleanly.")

    def test_chatbot_missing_question_fails(self):
        response = self.client.post(
            "/api/chatbot/",
            {"question": ""},
            format="json",
            HTTP_HOST="api.manhargurukkal.site",
        )
        self.assertEqual(response.status_code, 400)

