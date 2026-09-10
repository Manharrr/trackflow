from channels.middleware import BaseMiddleware
from django.db import connection
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
from apps.tenants.models import Domain

User = get_user_model()


@database_sync_to_async
def get_tenant_and_user(scope):
    # 1. Resolve Tenant using Host header
    headers = dict(scope.get("headers", []))
    host = headers.get(b"host", b"").decode("utf-8").split(":")[0]
    if not host:
        return None, AnonymousUser()

    try:
        domain = Domain.objects.select_related("tenant").get(domain=host)
        tenant = domain.tenant
    except Domain.DoesNotExist:
        return None, AnonymousUser()

    # Switch connection search path for active thread
    connection.set_tenant(tenant)
    
  # read jwt
    # 2. Resolve User using query params JWT token
    query_string = scope.get("query_string", b"").decode("utf-8")
    query_params = parse_qs(query_string)
    token = query_params.get("token", [None])[0]

    if not token:
        return tenant, AnonymousUser()

    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        # Fetch user profile
        user = User.objects.get(id=user_id)
        # Ensure user belongs to the active tenant domain workspace mapping
        from apps.tenants.models import UserTenant
        if not UserTenant.objects.filter(user=user, tenant=tenant).exists():
            return tenant, AnonymousUser()
        return tenant, user
    except Exception:
        return tenant, AnonymousUser()


class TenantChannelsMiddleware(BaseMiddleware):
    """
    ASGI middleware resolving tenant database scopes and JWT credentials
    prior to executing WebSocket connections.
    """

    async def __call__(self, scope, receive, send):
        tenant, user = await get_tenant_and_user(scope)
        if not tenant or user.is_anonymous:
            # Reject connection with unauthorized code
            await send({"type": "websocket.close", "code": 4003})
            return

        scope["tenant"] = tenant
        scope["user"] = user
        return await super().__call__(scope, receive, send)
