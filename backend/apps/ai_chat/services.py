import requests
from django.conf import settings

AI_SERVICE_URL = "http://127.0.0.1:8001/chat"


def ask_ai(question: str, tenant_id: int = None):

    payload = {
        "question": question,
        "tenant_id": tenant_id,
    }

    response = requests.post(
        AI_SERVICE_URL,
        json=payload,
        timeout=30,
    )

    response.raise_for_status()

    return response.json()