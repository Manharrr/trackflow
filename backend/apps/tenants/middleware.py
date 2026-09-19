from django.db import connection
from django_tenants.middleware.main import TenantMainMiddleware


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
            request.tenant = None
            self.setup_url_routing(request, force_public=True)
            return None

        return super().process_request(request)
