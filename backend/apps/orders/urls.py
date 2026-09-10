from django.urls import path
from apps.orders.views.order_views import (
    OrderListAPIView,
    OrderCreateAPIView,
    OrderDetailAPIView,
    OrderRestoreAPIView,
    OrderAssignAPIView,
    OrderBulkAssignAPIView,
    OrderStatusUpdateAPIView,
    OrderCancelAPIView,
    OrderFailAPIView,
    OrderDelayAPIView,
    OrderTimelineAPIView,
    OrderDashboardAPIView,
)

from apps.orders.views.operations_views import (
    OperationsDashboardAPIView,
    OperationsTeamOverviewAPIView,
    OperationsLeaderboardAPIView,
    OperationsChartsAPIView,
    OperationsAssignablePartnersAPIView,
)

urlpatterns = [
    path("", OrderListAPIView.as_view(), name="order-list"),
    path("create/", OrderCreateAPIView.as_view(), name="order-create"),
    path("dashboard/", OrderDashboardAPIView.as_view(), name="order-dashboard"),
    path("bulk-assign/", OrderBulkAssignAPIView.as_view(), name="order-bulk-assign"),
    
    # Operations Control Center Specific Routes
    path("operations-dashboard/", OperationsDashboardAPIView.as_view(), name="operations-dashboard"),
    path("operations-dashboard/team-overview/", OperationsTeamOverviewAPIView.as_view(), name="operations-team-overview"),
    path("operations-dashboard/leaderboard/", OperationsLeaderboardAPIView.as_view(), name="operations-leaderboard"),
    path("operations-dashboard/charts/", OperationsChartsAPIView.as_view(), name="operations-charts"),
    path("operations-dashboard/assignable-partners/", OperationsAssignablePartnersAPIView.as_view(), name="operations-assignable-partners"),

    path("<uuid:order_id>/", OrderDetailAPIView.as_view(), name="order-detail"),
    path("<uuid:order_id>/restore/", OrderRestoreAPIView.as_view(), name="order-restore"),
    path("<uuid:order_id>/assign/", OrderAssignAPIView.as_view(), name="order-assign"),
    path("<uuid:order_id>/status/", OrderStatusUpdateAPIView.as_view(), name="order-status-update"),
    path("<uuid:order_id>/cancel/", OrderCancelAPIView.as_view(), name="order-cancel"),
    path("<uuid:order_id>/fail/", OrderFailAPIView.as_view(), name="order-fail"),
    path("<uuid:order_id>/delay/", OrderDelayAPIView.as_view(), name="order-delay"),
    path("<uuid:order_id>/timeline/", OrderTimelineAPIView.as_view(), name="order-timeline"),
]
