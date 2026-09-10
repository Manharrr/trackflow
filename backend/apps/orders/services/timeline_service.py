from apps.orders.models.order import Order


class TimelineService:

    @staticmethod
    def get_timeline(order):
        """
        Gathers and chronologically orders all status histories, assignments,
        delivery attempts, and soft-delete/restore operations.
        """
        timeline = []

        # 1. Order Creation
        create_audit = order.audit_logs.filter(action="CREATE").first()
        timeline.append({
            "event": "Created",
            "title": "Order Created",
            "description": f"Order tracking ID {order.tracking_id} generated.",
            "timestamp": order.created_at,
            "operator": create_audit.changed_by.email if create_audit and create_audit.changed_by else "System",
        })

        # 2. Assignment / Reassignments
        for assignment in order.assignment_history.select_related("old_employee", "new_employee", "assigned_by").all():
            is_reassignment = assignment.old_employee is not None
            timeline.append({
                "event": "Assignment",
                "title": "Order Reassigned" if is_reassignment else "Order Assigned",
                "description": (
                    f"Reassigned from {assignment.old_employee.full_name} to {assignment.new_employee.full_name}. Reason: {assignment.reason}"
                    if is_reassignment else
                    f"Assigned to {assignment.new_employee.full_name}."
                ),
                "timestamp": assignment.created_at,
                "operator": assignment.assigned_by.email if assignment.assigned_by else "System",
            })

        # 3. Status Updates
        for status_log in order.status_history.select_related("changed_by").all():
            timeline.append({
                "event": "StatusChange",
                "title": f"Status: {status_log.current_status}",
                "description": status_log.remarks or f"Order status changed to {status_log.current_status}.",
                "timestamp": status_log.created_at,
                "operator": status_log.changed_by.email if status_log.changed_by else "System",
            })

        # 4. Delivery Attempts (Failures / Delays)
        for attempt in order.attempts.select_related("employee").all():
            timeline.append({
                "event": attempt.status,
                "title": f"Delivery Attempt {attempt.status}",
                "description": f"Attempt #{attempt.attempt_number} &bull; Reason: {attempt.reason}. Remarks: {attempt.remarks}",
                "timestamp": attempt.attempted_at,
                "operator": attempt.employee.full_name if attempt.employee else "Courier",
            })

        # 5. Soft-Deletes & Restores
        for audit in order.audit_logs.select_related("changed_by").filter(action__in=["DELETE", "RESTORE"]):
            timeline.append({
                "event": audit.action,
                "title": "Order Soft Deleted" if audit.action == "DELETE" else "Order Restored",
                "description": "Order flagged as inactive/deleted." if audit.action == "DELETE" else "Order restored to active directory.",
                "timestamp": audit.created_at,
                "operator": audit.changed_by.email if audit.changed_by else "System",
            })

        # Sort timeline by timestamp ascending
        timeline.sort(key=lambda x: x["timestamp"])
        return timeline
