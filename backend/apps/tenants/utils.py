from apps.tenants.models import Client, UserTenant


def resolve_request_tenant(request):
    """
    Resolves the active tenant (Client instance) for a request.

    Enforces strict authorization:
    1. Unauthenticated requests always return None.
    2. Superusers (request.user.is_superuser) can access any resolved Client.
    3. For normal users, any resolved Client (whether from request.tenant,
       JWT claims, or UserTenant mapping) MUST be backed by an active
       UserTenant record (is_active=True) for request.user.
    4. If a JWT tenant claim (schema_name or tenant_id) is provided but the user
       is inactive or not a member of that tenant, access is rejected (returns None)
       without falling back to unrelated workspaces.
    5. Caches the verified tenant on request.tenant for downstream consumers.
    """
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    is_super = getattr(user, "is_superuser", False)

    # 1. Inspect request.tenant if already assigned a valid Client instance
    tenant = getattr(request, "tenant", None)
    if tenant and isinstance(tenant, Client):
        if is_super or UserTenant.objects.filter(user=user, tenant=tenant, is_active=True).exists():
            return tenant
        return None

    # 2. Inspect JWT token claims if available
    auth = getattr(request, "auth", None)
    if auth and hasattr(auth, "get"):
        schema_name = auth.get("schema_name")
        tenant_id = auth.get("tenant_id")
        if schema_name or tenant_id:
            client = None
            if schema_name:
                client = Client.objects.filter(schema_name=schema_name).first()
            elif tenant_id:
                client = Client.objects.filter(id=tenant_id).first()

            if not client:
                return None

            # Enforce authorization for the claimed tenant
            if is_super or UserTenant.objects.filter(user=user, tenant=client, is_active=True).exists():
                request.tenant = client
                return client

            # Claimed tenant exists, but user is not an active member:
            # Do NOT fall back to an unrelated tenant; reject access.
            return None

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

