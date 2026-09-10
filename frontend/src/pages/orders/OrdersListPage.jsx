import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  listOrders, 
  getOrderDetails,
  bulkAssignOrders, 
  updateOrderStatus, 
  cancelOrder, 
  failDelivery, 
  markDelayed,
  deleteOrder
} from "../../services/ordersService";
import { listEmployees } from "../company-admin/employees/services/employeeService";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Package, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit3, 
  UserCheck, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Trash2 
} from "lucide-react";
import toast from "react-hot-toast";

export default function OrdersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Scoping checks
  const userRole = user?.role || user?.user?.role || "employee";
  const isOM = userRole === "operations_manager";
  const isDriver = userRole === "employee";

  // State parameters
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selection states (for bulk assignment)
  const [selectedIds, setSelectedIds] = useState([]);

  // Drivers lookup
  const [drivers, setDrivers] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Exception modals states
  const [activeOrder, setActiveOrder] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Customer Cancelled");
  const [customReason, setCustomReason] = useState("");

  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState("Customer Unavailable");
  const [failRemarks, setFailRemarks] = useState("");

  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState("Traffic");
  const [delayRemarks, setDelayRemarks] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        status: statusFilter,
        priority: priorityFilter,
        sort,
        page,
      };
      const res = await listOrders(params);
      setOrders(res.results || []);
      setCount(res.count || 0);
    } catch (err) {
      toast.error("Failed to load orders directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    const priorityParam = params.get("priority");
    if (priorityParam) {
      setPriorityFilter(priorityParam);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, priorityFilter, sort, page]);

  useEffect(() => {
    const handleOrderAssigned = async (e) => {
      const orderId = e.detail?.orderId;
      if (!orderId) return;

      console.log("Order assignment event received, fetching details for:", orderId);
      try {
        const newOrder = await getOrderDetails(orderId);
        
        // Update local orders list state
        setOrders((prev) => {
          // If already in list, update it
          if (prev.some((o) => o.id === newOrder.id)) {
            return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
          }
          // Otherwise, prepend the new order
          return [newOrder, ...prev];
        });

        // Increment count
        setCount((c) => c + 1);
        
        // Show success toast indicating assignment loaded
        toast.success(`Shipment ${newOrder.tracking_id || ""} loaded in workspace!`);
      } catch (err) {
        console.error("Failed to load newly assigned order details:", err);
      }
    };

    window.addEventListener("orderAssigned", handleOrderAssigned);
    return () => {
      window.removeEventListener("orderAssigned", handleOrderAssigned);
    };
  }, []);

  // Load drivers if current user is OM (to display dropdown)
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const res = await listEmployees("", "employee", "true", 1);
        setDrivers(res.results || []);
      } catch (err) {
        // Silently ignore or show warning
      }
    };
    if (isOM) {
      loadDrivers();
    }
  }, [isOM]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(orders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk assignment submit
  const handleBulkAssign = async () => {
    if (!selectedDriverId) {
      toast.error("Please select a courier executive.");
      return;
    }
    try {
      await bulkAssignOrders(selectedIds, selectedDriverId);
      toast.success("Successfully bulk-assigned selected dispatches!");
      setShowBulkModal(false);
      setSelectedIds([]);
      fetchOrders();
    } catch (err) {
      toast.error("Bulk assignment failed.");
    }
  };

  // Delete Order
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to soft delete this order?")) return;
    try {
      await deleteOrder(id);
      toast.success("Order deleted successfully.");
      fetchOrders();
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  // Transitions
  const handleTransitionStatus = async (orderId, targetStatus) => {
    try {
      await updateOrderStatus(orderId, targetStatus, `Inline status transition to ${targetStatus}`);
      toast.success(`Status updated to ${targetStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.status?.[0] || "Invalid status transition.");
    }
  };

  // Exception submissions
  const handleCancelSubmit = async () => {
    const reason = cancelReason === "Other" ? customReason : cancelReason;
    try {
      await cancelOrder(activeOrder.id, reason);
      toast.success("Order cancelled successfully.");
      setShowCancelModal(false);
      setActiveOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error("Cancel failed.");
    }
  };

  const handleFailSubmit = async () => {
    try {
      await failDelivery(activeOrder.id, failReason, failRemarks);
      toast.success("Failed attempt logged.");
      setShowFailModal(false);
      setActiveOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error("Failed logging attempt.");
    }
  };

  const handleDelaySubmit = async () => {
    try {
      await markDelayed(activeOrder.id, delayReason, delayRemarks);
      toast.success("Delay logged successfully.");
      setShowDelayModal(false);
      setActiveOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error("Failed logging delay.");
    }
  };

  const totalPages = Math.ceil(count / 10);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-dark" />
            Shipment Registry
          </h1>
          <p className="text-muted-gray mt-1 text-sm">
            List, query search, assign couriers, and trace delivery SLA priorities.
          </p>
        </div>

        {isOM && (
          <div className="flex gap-3">
            <Link
              to="/orders/create"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-primary/15 transition-all duration-200 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              Create Order
            </Link>
          </div>
        )}
      </div>

      {/* Query Search / Filter Bar */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm p-4 flex flex-col lg:flex-row items-center gap-4">
        <div className="relative w-full lg:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-xs font-bold text-dark-text cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Out For Delivery">Out For Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Failed">Failed</option>
            <option value="RTO">RTO</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-xs font-bold text-dark-text cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-xs font-bold text-dark-text cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="priority">Sort: Priority</option>
            <option value="expected_delivery">Sort: SLA SLA Date</option>
          </select>
        </div>
      </div>

      {/* Grid List Table */}
      <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden hover:border-primary/10 transition-all duration-300">
        {loading ? (
          <div className="p-16 text-center space-y-4">
            <svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-400 font-semibold text-sm">Loading dispatches...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-bg-tint border border-border-light flex items-center justify-center mx-auto mb-4 text-primary">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-dark-text text-base">No dispatches found</h3>
            <p className="text-xs text-muted-gray mt-1">Try refining search parameters or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tint/40 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-border-light/60">
                <tr>
                  <th className="p-4 text-left">Tracking ID</th>
                  <th className="p-4 text-left">Customer</th>
                  <th className="p-4 text-left">Addresses</th>
                  <th className="p-4 text-left">Courier Executive</th>
                  <th className="p-4 text-left">Priority</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">SLA SLA Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50 text-muted-gray">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-bg-tint/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-xs text-primary-dark">
                      {ord.tracking_id}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-dark-text">{ord.customer_name}</div>
                      <div className="text-[10px] text-muted-gray font-mono">{ord.customer_phone}</div>
                    </td>
                    <td className="p-4 max-w-xs truncate text-xs">
                      <div><strong className="text-[10px] uppercase text-slate-400">To:</strong> {ord.delivery_address}</div>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {ord.assigned_employee_name || (
                        <span className="text-amber-600 font-bold text-[10px] uppercase">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        ord.priority === "Urgent" ? "bg-red-50 border-red-200 text-red-700" :
                        ord.priority === "High" ? "bg-amber-50 border-amber-200 text-amber-700" :
                        ord.priority === "Medium" ? "bg-blue-50 border-blue-200 text-blue-700" :
                        "bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        {ord.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        ord.status === "Delivered" ? "bg-primary/10 border-primary/20 text-primary-dark" :
                        ord.status === "Cancelled" ? "bg-slate-100 border-slate-300 text-slate-500" :
                        ord.status === "Failed" ? "bg-rose-50 border-rose-200 text-rose-700" :
                        ord.status === "Pending" ? "bg-amber-50 border-amber-200 text-amber-700" :
                        "bg-indigo-50 border-indigo-200 text-indigo-700"
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {ord.expected_delivery_date ? new Date(ord.expected_delivery_date).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/dashboard/orders/${ord.id}`)}
                          className="p-2 bg-white border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text rounded-xl shadow-sm transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isOM && ord.status !== "Delivered" && ord.status !== "Cancelled" && (
                          <>
                            <button
                              onClick={() => navigate(`/dashboard/orders/${ord.id}/edit`)}
                              className="p-2 bg-white border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text rounded-xl shadow-sm transition-all cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ord.id)}
                              className="p-2 bg-white border border-border-light hover:border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl shadow-sm transition-all cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Driver / Partner status controls */}
                        {isDriver && ord.status !== "Delivered" && ord.status !== "Cancelled" && (
                          <div className="flex items-center gap-1.5">
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "Failed") {
                                  setActiveOrder(ord);
                                  setShowFailModal(true);
                                } else if (val === "Delayed") {
                                  setActiveOrder(ord);
                                  setShowDelayModal(true);
                                } else {
                                  handleTransitionStatus(ord.id, val);
                                }
                                e.target.value = "";
                              }}
                              className="px-2 py-1.5 rounded-xl border border-border-light bg-white text-xs font-bold text-primary-dark cursor-pointer outline-none focus:border-primary shadow-sm"
                            >
                              <option value="">Update Status</option>
                              <option value="Picked Up">Picked Up</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Out For Delivery">Out For Delivery</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Failed">Failed</option>
                              <option value="Delayed">Delayed</option>
                            </select>
                          </div>
                        )}

                        {/* Cancel order button for OM */}
                        {isOM && ord.status !== "Delivered" && ord.status !== "Cancelled" && (
                          <button
                            onClick={() => {
                              setActiveOrder(ord);
                              setShowCancelModal(true);
                            }}
                            className="p-2 bg-white border border-border-light hover:border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl shadow-sm transition-all cursor-pointer"
                            title="Cancel Order"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border-light">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text rounded-xl shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-xs font-bold text-muted-gray">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text rounded-xl shadow-sm disabled:opacity-50 transition-all cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BULK ASSIGN MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4">Bulk Dispatch Assignments</h3>
            <p className="text-xs text-muted-gray mb-6">Select an active delivery partner to assign {selectedIds.length} orders.</p>
            
            <div className="space-y-4">
              <label className="block text-xs font-bold text-dark-text uppercase tracking-wider">Active Courier Driver</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-sm font-semibold text-dark-text cursor-pointer"
              >
                <option value="">Select Delivery Driver</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>{drv.full_name} ({drv.designation || "Executive"})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                className="px-5 py-2.5 rounded-xl bg-[#0F6E56] hover:bg-[#0c5946] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Assign Batches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4 flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" /> Cancel Order
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm font-semibold cursor-pointer outline-none focus:border-primary"
                >
                  <option value="Customer Cancelled">Customer Cancelled</option>
                  <option value="Duplicate Order">Duplicate Order</option>
                  <option value="Wrong Address">Wrong Address</option>
                  <option value="Customer Not Reachable">Customer Not Reachable</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {cancelReason === "Other" && (
                <div>
                  <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Specify Reason</label>
                  <input
                    type="text"
                    placeholder="Enter custom cancellation reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setActiveOrder(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelSubmit}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAIL MODAL */}
      {showFailModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Log Failed Delivery Attempt
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Failure Reason</label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm font-semibold cursor-pointer outline-none focus:border-primary"
                >
                  <option value="Customer Unavailable">Customer Unavailable</option>
                  <option value="Wrong Address">Wrong Address</option>
                  <option value="Phone Switched Off">Phone Switched Off</option>
                  <option value="Vehicle Issue">Vehicle Issue</option>
                  <option value="Weather">Weather Conditions</option>
                  <option value="Other">Other Reasons</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Operational Remarks</label>
                <textarea
                  placeholder="Enter detailed attempt remarks..."
                  value={failRemarks}
                  onChange={(e) => setFailRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-white text-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => {
                  setShowFailModal(false);
                  setActiveOrder(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleFailSubmit}
                className="px-5 py-2.5 rounded-xl bg-red-650 hover:bg-red-750 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Log Failed Attempt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELAY MODAL */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4 flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" /> Log Delayed Drop-off
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Delay Reason</label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm font-semibold cursor-pointer outline-none focus:border-primary"
                >
                  <option value="Traffic">Traffic Blockage</option>
                  <option value="Weather">Weather Obstacle</option>
                  <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                  <option value="Warehouse Delay">Warehouse Delay</option>
                  <option value="Customer Request">Customer Request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Remarks</label>
                <textarea
                  placeholder="Enter details..."
                  value={delayRemarks}
                  onChange={(e) => setDelayRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-white text-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => {
                  setShowDelayModal(false);
                  setActiveOrder(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleDelaySubmit}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Log Delay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
