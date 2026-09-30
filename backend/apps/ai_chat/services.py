import os
import requests
from django.conf import settings

AI_SERVICE_URL = os.environ.get(
    "AI_SERVICE_URL",
    getattr(settings, "AI_SERVICE_URL", "http://ai_service:8000/chat"),
)


def ask_ai(question: str, tenant_id: int = None, history: list = None, is_public: bool = False):

    payload = {
        "question": question,
        "tenant_id": tenant_id,
        "history": history or [],
        "is_public": is_public,
    }

    url = AI_SERVICE_URL
    try:
        response = requests.post(
            url,
            json=payload,
            timeout=30,
        )
    except requests.exceptions.ConnectionError:
        # Fallback for host development outside Docker container
        url = "http://127.0.0.1:8001/chat"
        response = requests.post(
            url,
            json=payload,
            timeout=30,
        )

    response.raise_for_status()

    return response.json()