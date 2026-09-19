from apps.tenants.models import Client, UserTenant


def resolve_request_tenant(request):
    """
    Resolves the active tenant (Client instance) for a request.

    Resolution order:
    1. request.tenant if it is already a valid Client instance (e.g. tenant domain routing, tests).
    2. JWT token claims ('schema_name' or 'tenant_id') via request.auth.
    3. Active UserTenant mapping for authenticated request.user.
    4. None if unauthenticated or no tenant mapping found.

    Caches the resolved tenant on request.tenant for downstream consumers.
    """
    tenant = getattr(request, "tenant", None)
    if tenant and isinstance(tenant, Client):
        return tenant

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    # 2. Check JWT token claims if available
    auth = getattr(request, "auth", None)
    if auth and hasattr(auth, "get"):
        schema_name = auth.get("schema_name")
        if schema_name:
            client = Client.objects.filter(schema_name=schema_name).first()
            if client:
                request.tenant = client
                return client

        tenant_id = auth.get("tenant_id")
        if tenant_id:
            client = Client.objects.filter(id=tenant_id).first()
            if client:
                request.tenant = client
                return client

    # 3. Fallback to active UserTenant mapping
    user_tenant = (
        UserTenant.objects.filter(user=user, is_active=True)
        .select_related("tenant")
        .first()
    )
    if user_tenant and user_tenant.tenant:
        request.tenant = user_tenant.tenant
        return user_tenant.tenant

    return None
