from django.db import connection
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_public_schema_name, get_tenant_model


class TrackFlowTenantMiddleware(TenantMainMiddleware):
    """
    TrackFlow domain routing:

    manhargurukkal.site
    api.manhargurukkal.site
        -> public schema

    <tenant>.manhargurukkal.site
        -> django-tenants normal tenant lookup
    """

    PUBLIC_HOSTS = {
        "manhargurukkal.site",
        "api.manhargurukkal.site",
    }

    def process_request(self, request):
        hostname = request.get_host().split(":")[0].lower()

        if hostname in self.PUBLIC_HOSTS:
            connection.set_schema_to_public()
            public_schema_name = get_public_schema_name()
            tenant_model = get_tenant_model()
            try:
                public_tenant = tenant_model.objects.get(schema_name=public_schema_name)
            except tenant_model.DoesNotExist as err:
                raise RuntimeError(
                    f"Public tenant with schema '{public_schema_name}' does not exist."
                ) from err

            public_tenant.domain_url = hostname
            request.tenant = public_tenant
            connection.set_tenant(public_tenant)
            self.setup_url_routing(request, force_public=True)
            return None

        return super().process_request(request)