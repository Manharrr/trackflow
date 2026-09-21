from urllib.parse import urlsplit
from apps.tenants.models import Client, Domain, UserTenant


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


def resolve_tenant_from_request_origin(request):
    """
    Resolves the active tenant (Client instance) from request origin/headers
    for unauthenticated or public-host endpoints.

    Resolution strategy:
    1. First use request.tenant if it is already a valid Client instance.
    2. Inspect HTTP Origin header.
    3. Referer as fallback if Origin is absent.
    4. Parse hostname safely via urllib.parse.urlsplit.
    5. Resolve hostname against the public Domain table (O(1)).
    6. Subdomain fallback needed for development (*.localhost, etc.).
    7. Never scans all tenant schemas; never uses raw SQL.
    8. Return None if hostname cannot resolve to a valid Client.
    """
    # 1. First use request.tenant if it is already a valid Client
    tenant = getattr(request, "tenant", None)
    if tenant and isinstance(tenant, Client):
        return tenant

    # 2. Otherwise inspect Origin
    candidate = None
    if hasattr(request, "headers") and request.headers.get("origin"):
        candidate = request.headers.get("origin")
    elif hasattr(request, "META") and request.META.get("HTTP_ORIGIN"):
        candidate = request.META.get("HTTP_ORIGIN")

    # 3. Then Referer as fallback
    if not candidate:
        if hasattr(request, "headers") and request.headers.get("referer"):
            candidate = request.headers.get("referer")
        elif hasattr(request, "META") and request.META.get("HTTP_REFERER"):
            candidate = request.META.get("HTTP_REFERER")

    if not candidate:
        return None

    candidate_str = str(candidate).strip()
    try:
        parsed = urlsplit(candidate_str)
        host = (parsed.hostname or candidate_str.split("/")[0]).split(":")[0].strip().lower()
    except Exception:
        host = candidate_str.split(":")[0].strip().lower()

    if not host:
        return None

    # 4. Resolve the hostname against the public Domain table
    domain_obj = Domain.objects.select_related("tenant").filter(domain=host).first()
    if domain_obj and domain_obj.tenant and isinstance(domain_obj.tenant, Client):
        return domain_obj.tenant

    # 5. Keep the existing localhost/subdomain fallback needed for development
    parts = host.split(".")
    if len(parts) >= 2:
        subdomain = parts[0]
        if subdomain and subdomain not in ("api", "www", "localhost", "127"):
            client = Client.objects.filter(schema_name=subdomain).first()
            if client and isinstance(client, Client):
                return client

    return None


