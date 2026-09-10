from django.db.models import Q, Count, Avg, F, ExpressionWrapper, DurationField, OuterRef, Subquery, Max
from django.utils import timezone
from apps.orders.models.order import Order, OrderStatus, OrderPriority
from apps.orders.models.history import AssignmentHistory, OrderStatusHistory
from apps.orders.models.attempt import DeliveryAttempt
from apps.orders.models.audit import OrderAuditLog
from apps.employees.models import Employee, Role
from datetime import timedelta


class OperationsDashboardService:
    # Extensible constants for easy future RBAC/tenant configuration integration
    SLA_WARNING_THRESHOLD_HOURS = 2
    MAX_COURIER_WORKLOAD = 5

    @classmethod
    def get_dashboard_metrics(cls, tenant) -> dict:
        """
        Aggregates and formats dashboard cards, performance metrics,
        and operations widgets in a highly optimized way.
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # ---------------------------------------------
        # 1. SUMMARY CARDS & STATS
        # ---------------------------------------------
        orders_qs = Order.objects.filter(company=tenant, is_deleted=False)

        # Aggregate counts to prevent multiple database hits
        stats = orders_qs.aggregate(
            total_orders=Count("id"),
            today_orders=Count("id", filter=Q(created_at__range=(today_start, today_end))),
            pending=Count("id", filter=Q(status=OrderStatus.PENDING)),
            assigned=Count("id", filter=Q(status=OrderStatus.ASSIGNED)),
            in_transit=Count("id", filter=Q(status=OrderStatus.IN_TRANSIT)),
            out_for_delivery=Count("id", filter=Q(status=OrderStatus.OUT_FOR_DELIVERY)),
            delivered_today=Count(
                "id",
                filter=Q(
                    status=OrderStatus.DELIVERED,
                    actual_delivery_date__range=(today_start, today_end),
                ),
            ),
            failed=Count("id", filter=Q(status=OrderStatus.FAILED)),
            cancelled=Count("id", filter=Q(status=OrderStatus.CANCELLED)),
            high_priority=Count(
                "id",
                filter=Q(
                    priority__in=[OrderPriority.HIGH, OrderPriority.URGENT]
                ) & ~Q(
                    status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
                ),
            ),
            # Count distinct orders with a "Delayed" delivery attempt
            delayed=Count(
                "id",
                distinct=True,
                filter=Q(attempts__status="Delayed"),
            ),
        )

        # ---------------------------------------------
        # 2. PERFORMANCE METRICS
        # ---------------------------------------------
        # Average Delivery Time (Delivered orders only)
        avg_delivery = orders_qs.filter(
            status=OrderStatus.DELIVERED,
            actual_delivery_date__isnull=False,
        ).annotate(
            duration=F("actual_delivery_date") - F("created_at")
        ).aggregate(avg_time=Avg("duration"))

        avg_delivery_seconds = 0
        if avg_delivery["avg_time"]:
            avg_delivery_seconds = int(avg_delivery["avg_time"].total_seconds())

        # Average Assignment Time (orders with assignments)
        # Using AssignmentHistory to find duration of first assignment
        first_assignment = AssignmentHistory.objects.filter(
            order=OuterRef("pk")
        ).order_by("created_at")

        avg_assign = orders_qs.filter(
            status_history__current_status=OrderStatus.ASSIGNED
        ).annotate(
            assign_time=Subquery(first_assignment.values("created_at")[:1])
        ).annotate(
            duration=F("assign_time") - F("created_at")
        ).aggregate(avg_time=Avg("duration"))

        avg_assign_seconds = 0
        if avg_assign["avg_time"]:
            avg_assign_seconds = int(avg_assign["avg_time"].total_seconds())

        # SLA checks
        sla_limit = now + timedelta(hours=cls.SLA_WARNING_THRESHOLD_HOURS)
        near_sla_count = orders_qs.exclude(
            status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
        ).filter(
            expected_delivery_date__gt=now,
            expected_delivery_date__lte=sla_limit,
        ).count()

        # Success & Failure rates
        delivered_count = orders_qs.filter(status=OrderStatus.DELIVERED).count()
        failed_count = orders_qs.filter(status=OrderStatus.FAILED).count()
        total_terminal = delivered_count + failed_count

        success_rate = 0.0
        failure_rate = 0.0
        if total_terminal > 0:
            success_rate = round((delivered_count / total_terminal) * 100, 1)
            failure_rate = round((failed_count / total_terminal) * 100, 1)

        today_count = stats["today_orders"]
        today_delivery_rate = 0.0
        if today_count > 0:
            today_delivery_rate = round((stats["delivered_today"] / today_count) * 100, 1)

        # ---------------------------------------------
        # 3. RECENT ACTIVITIES FEED
        # ---------------------------------------------
        # Retrieve latest 10 operational audit actions
        recent_audits = OrderAuditLog.objects.filter(
            order__company=tenant
        ).select_related(
            "order", "changed_by"
        ).order_by("-created_at")[:10]

        activities = []
        for audit in recent_audits:
            desc = audit.changes.get("description", f"Action {audit.action} executed.")
            activities.append({
                "id": str(audit.id),
                "order_id": str(audit.order.id),
                "tracking_id": audit.order.tracking_id,
                "action": audit.action,
                "description": desc,
                "changed_by": audit.changed_by.email if audit.changed_by else "System",
                "timestamp": audit.created_at,
            })

        # ---------------------------------------------
        # 4. DISPATCH QUEUE WIDGET
        # ---------------------------------------------
        # A list of orders waiting assignment or marked urgent
        pending_list = orders_qs.filter(
            status=OrderStatus.PENDING
        ).order_by("-created_at")[:10]

        urgent_list = orders_qs.filter(
            priority=OrderPriority.URGENT
        ).exclude(
            status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
        ).order_by("expected_delivery_date")[:10]

        # ---------------------------------------------
        # 5. EXCEPTION CENTER (Operational Alerts)
        # ---------------------------------------------
        delayed_orders = orders_qs.exclude(
            status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RTO]
        ).filter(
            expected_delivery_date__lt=now
        ).order_by("expected_delivery_date")[:10]

        failed_orders = orders_qs.filter(
            status=OrderStatus.FAILED
        ).order_by("-updated_at")[:10]

        # Combine items into a uniform analytics/kpi schema payload
        return {
            "summary_cards": {
                "total_orders": stats["total_orders"],
                "today_orders": stats["today_orders"],
                "pending": stats["pending"],
                "assigned": stats["assigned"],
                "in_transit": stats["in_transit"],
                "out_for_delivery": stats["out_for_delivery"],
                "delivered_today": stats["delivered_today"],
                "failed": stats["failed"],
                "cancelled": stats["cancelled"],
                "delayed": stats["delayed"],
                "high_priority": stats["high_priority"],
            },
            "performance_metrics": {
                "today_delivery_rate": today_delivery_rate,
                "average_delivery_seconds": avg_delivery_seconds,
                "average_assignment_seconds": avg_assign_seconds,
                "orders_pending_assignment": stats["pending"],
                "orders_near_sla": near_sla_count,
                "delivery_success_rate": success_rate,
                "failure_rate": failure_rate,
            },
            "recent_activities": activities,
            "dispatch_queue": {
                "pending_orders": [
                    {
                        "id": str(o.id),
                        "tracking_id": o.tracking_id,
                        "customer_name": o.customer_name,
                        "priority": o.priority,
                        "expected_delivery_date": o.expected_delivery_date,
                    }
                    for o in pending_list
                ],
                "urgent_orders": [
                    {
                        "id": str(o.id),
                        "tracking_id": o.tracking_id,
                        "customer_name": o.customer_name,
                        "priority": o.priority,
                        "expected_delivery_date": o.expected_delivery_date,
                    }
                    for o in urgent_list
                ],
            },
            "exceptions": {
                "delayed_orders": [
                    {
                        "id": str(o.id),
                        "tracking_id": o.tracking_id,
                        "customer_name": o.customer_name,
                        "expected_delivery_date": o.expected_delivery_date,
                    }
                    for o in delayed_orders
                ],
                "failed_orders": [
                    {
                        "id": str(o.id),
                        "tracking_id": o.tracking_id,
                        "customer_name": o.customer_name,
                        "attempt_count": o.attempt_count,
                    }
                    for o in failed_orders
                ],
            },
        }

    @classmethod
    def get_team_overview(cls, tenant) -> dict:
        """
        Gathers workforce utilization and workload counts for all active couriers.
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        drivers = Employee.objects.filter(
            tenant=tenant,
            role=Role.EMPLOYEE,
        )

        total_drivers = drivers.count()

        # Count active loads assigned to each driver
        # Active loads are in non-terminal states: Assigned, Picked Up, In Transit, Out For Delivery, Failed
        active_statuses = [
            OrderStatus.ASSIGNED,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.FAILED,
        ]

        drivers_with_loads = drivers.annotate(
            active_loads_count=Count(
                "assigned_orders",
                filter=Q(assigned_orders__status__in=active_statuses, assigned_orders__is_deleted=False),
            ),
            completed_today_count=Count(
                "assigned_orders",
                filter=Q(
                    assigned_orders__status=OrderStatus.DELIVERED,
                    assigned_orders__actual_delivery_date__range=(today_start, today_end),
                    assigned_orders__is_deleted=False,
                ),
            ),
        )

        # Categorize driver statuses
        available = 0
        busy = 0
        inactive = 0
        blocked = 0

        for drv in drivers_with_loads:
            if not drv.is_active:
                inactive += 1
            elif drv.is_blocked:
                blocked += 1
            elif drv.active_loads_count >= cls.MAX_COURIER_WORKLOAD:
                busy += 1
            else:
                available += 1

        # Today's assignments & completed drop-offs total
        orders_assigned_today = Order.objects.filter(
            company=tenant,
            status_history__current_status=OrderStatus.ASSIGNED,
            status_history__created_at__range=(today_start, today_end),
            is_deleted=False,
        ).distinct().count()

        deliveries_completed_today = Order.objects.filter(
            company=tenant,
            status=OrderStatus.DELIVERED,
            actual_delivery_date__range=(today_start, today_end),
            is_deleted=False,
        ).count()

        return {
            "total_delivery_partners": total_drivers,
            "available": available,
            "busy": busy,
            "inactive": inactive,
            "blocked": blocked,
            "orders_assigned_today": orders_assigned_today,
            "deliveries_completed_today": deliveries_completed_today,
        }

    @classmethod
    def get_employee_performance_leaderboard(cls, tenant) -> list:
        """
        Compiles the list of courier workloads and success rankings.
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        drivers = Employee.objects.filter(
            tenant=tenant,
            role=Role.EMPLOYEE,
        )

        # Calculate driver performance stats
        active_statuses = [
            OrderStatus.ASSIGNED,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.FAILED,
        ]

        # Annotate stats
        performance_qs = drivers.annotate(
            assigned_orders_cnt=Count("assigned_orders", filter=Q(assigned_orders__is_deleted=False)),
            completed_orders_cnt=Count(
                "assigned_orders", 
                filter=Q(assigned_orders__status=OrderStatus.DELIVERED, assigned_orders__is_deleted=False)
            ),
            failed_orders_cnt=Count(
                "assigned_orders", 
                filter=Q(assigned_orders__status=OrderStatus.FAILED, assigned_orders__is_deleted=False)
            ),
            cancelled_orders_cnt=Count(
                "assigned_orders", 
                filter=Q(assigned_orders__status=OrderStatus.CANCELLED, assigned_orders__is_deleted=False)
            ),
            active_orders_cnt=Count(
                "assigned_orders", 
                filter=Q(assigned_orders__status__in=active_statuses, assigned_orders__is_deleted=False)
            ),
            # Max attempt timestamp to find last activity
            last_activity=Max("assigned_orders__updated_at")
        )

        leaderboard = []
        for drv in performance_qs:
            total_terminal = drv.completed_orders_cnt + drv.failed_orders_cnt
            success_rate = 0.0
            if total_terminal > 0:
                success_rate = round((drv.completed_orders_cnt / total_terminal) * 100, 1)

            # Find average delivery time for this driver
            avg_time_qs = Order.objects.filter(
                assigned_employee=drv,
                status=OrderStatus.DELIVERED,
                actual_delivery_date__isnull=False,
                is_deleted=False,
            ).annotate(
                duration=F("actual_delivery_date") - F("created_at")
            ).aggregate(avg_time=Avg("duration"))

            avg_seconds = 0
            if avg_time_qs["avg_time"]:
                avg_seconds = int(avg_time_qs["avg_time"].total_seconds())

            # Availability state mapping
            if not drv.is_active:
                availability = "Inactive"
            elif drv.is_blocked:
                availability = "Blocked"
            elif drv.active_orders_cnt >= cls.MAX_COURIER_WORKLOAD:
                availability = "Busy"
            else:
                availability = "Available"

            leaderboard.append({
                "id": str(drv.id),
                "employee_name": drv.full_name,
                "assigned_orders": drv.assigned_orders_cnt,
                "completed_orders": drv.completed_orders_cnt,
                "failed_orders": drv.failed_orders_cnt,
                "cancelled_orders": drv.cancelled_orders_cnt,
                "avg_delivery_seconds": avg_seconds,
                "success_rate": success_rate,
                "active_orders": drv.active_orders_cnt,
                "availability": availability,
                "last_activity": drv.last_activity,
            })

        # Sort leaderboard by success rate descending, then completed orders count descending
        leaderboard.sort(key=lambda x: (-x["success_rate"], -x["completed_orders"]))
        return leaderboard

    @classmethod
    def get_charts_data(cls, tenant) -> dict:
        """
        Calculates and structures time-trend dispatches data for dynamic graphs.
        """
        now = timezone.now()
        orders_qs = Order.objects.filter(company=tenant, is_deleted=False)

        # 1. Orders by Status
        status_counts = orders_qs.values("status").annotate(count=Count("id")).order_by("-count")
        
        # 2. Orders by Priority
        priority_counts = orders_qs.values("priority").annotate(count=Count("id")).order_by("-count")

        # 3. Trends for last 15 days
        trend_days = 15
        start_date = now - timedelta(days=trend_days)
        
        # We can construct trends dynamically
        # Since sqlite/postgres have different date truncation syntax,
        # we can aggregate them in Python from a query range to be completely DB-agnostic!
        recent_orders = orders_qs.filter(created_at__gte=start_date)
        
        daily_created = {}
        daily_delivered = {}
        
        for i in range(trend_days + 1):
            day_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_created[day_str] = 0
            daily_delivered[day_str] = 0

        for o in recent_orders:
            day_str = o.created_at.strftime("%Y-%m-%d")
            if day_str in daily_created:
                daily_created[day_str] += 1
            if o.status == OrderStatus.DELIVERED and o.actual_delivery_date:
                del_str = o.actual_delivery_date.strftime("%Y-%m-%d")
                if del_str in daily_delivered:
                    daily_delivered[del_str] += 1

        trend_data = [
            {
                "date": date_key,
                "created": daily_created[date_key],
                "delivered": daily_delivered[date_key],
            }
            for date_key in sorted(daily_created.keys())
        ]

        return {
            "status_distribution": {item["status"]: item["count"] for item in status_counts},
            "priority_distribution": {item["priority"]: item["count"] for item in priority_counts},
            "trends": trend_data,
        }

    @classmethod
    def get_assignable_partners(cls, tenant) -> list:
        """
        Returns only active and unblocked delivery partners of the current tenant,
        annotated with active loads and drop counts.
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        drivers = Employee.objects.filter(
            tenant=tenant,
            role=Role.EMPLOYEE,
            is_active=True,
            is_blocked=False,
        )

        active_statuses = [
            OrderStatus.ASSIGNED,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.FAILED,
        ]

        drivers_annotated = drivers.annotate(
            active_orders_count=Count(
                "assigned_orders",
                filter=Q(assigned_orders__status__in=active_statuses, assigned_orders__is_deleted=False),
            ),
            completed_today_count=Count(
                "assigned_orders",
                filter=Q(
                    assigned_orders__status=OrderStatus.DELIVERED,
                    assigned_orders__actual_delivery_date__range=(today_start, today_end),
                    assigned_orders__is_deleted=False,
                ),
            ),
        )

        partners = []
        for drv in drivers_annotated:
            availability = "Busy" if drv.active_orders_count >= cls.MAX_COURIER_WORKLOAD else "Available"
            partners.append({
                "id": str(drv.id),
                "full_name": drv.full_name,
                "availability": availability,
                "active_orders": drv.active_orders_count,
                "completed_today": drv.completed_today_count,
            })
        return partners
