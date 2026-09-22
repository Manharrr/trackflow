import logging
from urllib.parse import parse_qs, urlsplit
from channels.middleware import BaseMiddleware
from django.db import connection
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from apps.tenants.models import Client, Domain, UserTenant

User = get_user_model()
logger = logging.getLogger(__name__)


@database_sync_to_async
def get_tenant_and_user(scope):
    # 1. Resolve Tenant using Host header (preserving existing behavior for tenant hosts)
    headers = dict(scope.get("headers", []))
    host = headers.get(b"host", b"").decode("utf-8").split(":")[0].strip().lower()

    tenant = None
    if host:
        try:
            domain = Domain.objects.select_related("tenant").get(domain=host)
            if domain.tenant and domain.tenant.schema_name != "public":
                tenant = domain.tenant
        except Domain.DoesNotExist:
            tenant = None

    # 2. Resolve User using query params JWT token
    query_string = scope.get("query_string", b"").decode("utf-8")
    query_params = parse_qs(query_string)
    token = query_params.get("token", [None])[0]

    if not token:
        logger.warning("WebSocket handshake rejected: missing token.")
        return None, AnonymousUser()

    try:
        access_token = AccessToken(token)
        user_id = access_token.get("user_id")
        if not user_id:
            logger.warning("WebSocket handshake rejected: token missing user_id.")
            return None, AnonymousUser()
        user = User.objects.get(id=user_id)
        if not user.is_active:
            logger.warning("WebSocket handshake rejected: user %s is inactive.", user_id)
            return None, AnonymousUser()
    except Exception as e:
        logger.warning("WebSocket handshake rejected: invalid JWT token (%s).", e)
        return None, AnonymousUser()

    # 3. For public API host (e.g. api.manhargurukkal.site, localhost:8000), resolve tenant via JWT or fallback
    if not tenant:
        # Check token claims (tenant_id or schema_name)
        tenant_id = access_token.get("tenant_id")
        schema_name = access_token.get("schema_name")

        if tenant_id:
            tenant = Client.objects.filter(id=tenant_id).first()
        elif schema_name and schema_name != "public":
            tenant = Client.objects.filter(schema_name=schema_name).first()

    # 4. Fallback: resolve from Origin / Referer header if available
    if not tenant:
        candidate_origin = None
        if b"origin" in headers:
            candidate_origin = headers[b"origin"].decode("utf-8")
        elif b"referer" in headers:
            candidate_origin = headers[b"referer"].decode("utf-8")

        if candidate_origin:
            try:
                parsed = urlsplit(candidate_origin)
                origin_host = (parsed.hostname or candidate_origin.split("/")[0]).split(":")[0].strip().lower()
                domain_obj = Domain.objects.select_related("tenant").filter(domain=origin_host).first()
                if domain_obj and domain_obj.tenant and domain_obj.tenant.schema_name != "public":
                    tenant = domain_obj.tenant
            except Exception:
                pass

    # 5. Fallback: user's active UserTenant mapping
    if not tenant:
        user_tenant = (
            UserTenant.objects.filter(user=user, is_active=True)
            .select_related("tenant")
            .first()
        )
        if user_tenant and user_tenant.tenant and user_tenant.tenant.schema_name != "public":
            tenant = user_tenant.tenant

    if not tenant or tenant.schema_name == "public":
        logger.warning("WebSocket handshake rejected: unable to resolve tenant for user %s.", user.id)
        return None, AnonymousUser()

    # 6. Ensure user belongs to the active tenant domain workspace mapping
    if not (user.is_superuser or UserTenant.objects.filter(user=user, tenant=tenant, is_active=True).exists()):
        logger.warning("WebSocket handshake rejected: user %s has no active mapping for tenant %s.", user.id, tenant.schema_name)
        return None, AnonymousUser()

    # Switch connection search path for active thread
    connection.set_tenant(tenant)
    return tenant, user


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
