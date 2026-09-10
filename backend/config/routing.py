from django.urls import path
from apps.chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from apps.notifications.routing import websocket_urlpatterns as notifications_websocket_urlpatterns

# Root WebSocket router url patterns configuration

websocket_urlpatterns = [
    # Application routes will be mapped here in subsequent phases
] + chat_websocket_urlpatterns + notifications_websocket_urlpatterns
