from django.urls import path
from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/chat/conversations/<uuid:conversation_id>/", ChatConsumer.as_asgi()),
]
