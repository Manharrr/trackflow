import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing consumers and routing urls.
django_asgi_app = get_asgi_application()

from config.routing import websocket_urlpatterns
from apps.chat.middleware.tenant_channels_middleware import TenantChannelsMiddleware

application = ProtocolTypeRouter({   #traffic controller
    # Route standard HTTP connections to Django
    "http": django_asgi_app,
    
    # Route WebSocket connections to the root URL router wrapped with multi-tenant auth middleware
    "websocket": TenantChannelsMiddleware(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
