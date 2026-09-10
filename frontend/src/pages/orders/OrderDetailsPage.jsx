import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  getOrderDetails, 
  getOrderTimeline, 
  assignOrder,
  cancelOrder
} from "../../services/ordersService";
import { listEmployees } from "../company-admin/employees/services/employeeService";
import SearchableCourierSelector from "../../components/ui/SearchableCourierSelector";
import { useAuth } from "../../contexts/AuthContext";
import { 
  ArrowLeft, 
  Package, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield, 
  FileText, 
  History, 
  PlusCircle, 
  ArrowRight,
  UserCheck
} from "lucide-react";
import toast from "react-hot-toast";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scopes
  const userRole = user?.role || user?.user?.role || "employee";
  const isOM = userRole === "operations_manager";

  // Data states
  const [order, setOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Driver assign modal
  const [drivers, setDrivers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [reassignReason, setReassignReason] = useState("Wrong Assignment");

  // Cancel modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Customer Cancelled");

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const details = await getOrderDetails(orderId);
      setOrder(details);
      
      const timelineData = await getOrderTimeline(orderId);
      setTimeline(timelineData);
    } catch (err) {
      toast.error("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchDetails();
    }
  }, [orderId]);

  // Load drivers list if OM
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const res = await listEmployees("", "employee", "true", 1);
        setDrivers(res.results || []);
      } catch (err) {
        // Ignore
      }
    };
    if (isOM) {
      loadDrivers();
    }
  }, [isOM]);

  const handleAssignSubmit = async () => {
    if (!selectedDriverId) {
      toast.error("Please select a courier executive.");
      return;
    }
    try {
      await assignOrder(orderId, selectedDriverId, order.assigned_employee ? reassignReason : "Initial assignment");
      toast.success("Courier assigned successfully!");
      setShowAssignModal(false);
      fetchDetails();
    } catch (err) {
      toast.error("Assignment failed.");
    }
  };

  const handleCancelSubmit = async () => {
    try {
      await cancelOrder(orderId, cancelReason);
      toast.success("Shipment order successfully cancelled.");
      setShowCancelModal(false);
      fetchDetails();
    } catch (err) {
      toast.error("Failed to cancel shipment.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse text-left">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="bg-white border border-border-light rounded-3xl p-8 h-96"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-slate-400 font-semibold">Order not found.</p>
        <button onClick={() => navigate("/dashboard/orders")} className="mt-4 text-primary font-bold">
          Back to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left animate-fade-in">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(isOM ? "/dashboard/orders" : "/employee")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-dark-text transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Command Hub
        </button>
      </div>

      {/* Detail Container Card */}
      <div className="bg-white rounded-[2rem] border border-border-light shadow-xl overflow-hidden hover:border-primary/10 transition-all duration-300">
        
        {/* Header color band */}
        <div className="h-32 bg-gradient-to-r from-primary to-primary-dark relative">
          <div className="absolute top-4 right-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${
              order.status === "Delivered" ? "bg-white border-primary/20 text-primary-dark" :
              order.status === "Cancelled" ? "bg-slate-50 border-slate-200 text-slate-400" :
              "bg-amber-50 border-amber-250 text-amber-700"
            }`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Details Wrapper */}
        <div className="px-8 sm:px-12 pb-8 relative">
          
          <div className="relative -mt-16 mb-6 inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center">
              <Package className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">
                {order.tracking_id}
              </h1>
              <p className="text-sm font-semibold text-muted-gray">
                Priority: <span className="text-primary-dark font-bold">{order.priority}</span>
              </p>
            </div>

            {isOM && order.status !== "Delivered" && order.status !== "Cancelled" && (
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  {order.assigned_employee ? "Reassign Executive" : "Assign Executive"}
                </button>
                <Link
                  to={`/dashboard/orders/${order.id}/edit`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Edit Details
                </Link>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 hover:border-rose-350 hover:bg-rose-50 text-rose-600 font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Cancel Shipment
                </button>
              </div>
            )}
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-border-light/60">
            
            {/* Left side: Customer details */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-dark-text uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
                Recipient Info
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-dark-text">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-muted-gray">{order.customer_phone}</span>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-muted-gray">{order.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: SLA/Assigned details */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-dark-text uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full inline-block"></span>
                SLA & Courier Assignment
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expected Delivery</span>
                    <span className="text-xs font-bold text-dark-text">
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Courier Driver</span>
                    <span className="text-xs font-bold text-dark-text">
                      {order.assigned_employee_name || "Unassigned"}
                    </span>
                  </div>
                </div>

                {order.assigned_by_email && (
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dispatched By</span>
                      <span className="text-xs font-semibold text-muted-gray">{order.assigned_by_email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Addresses Span */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-border-light/40">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pickup Address</span>
                  <p className="text-xs font-semibold text-dark-text mt-0.5 leading-relaxed">{order.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Delivery Destination</span>
                  <p className="text-xs font-semibold text-dark-text mt-0.5 leading-relaxed">{order.delivery_address}</p>
                </div>
              </div>
            </div>

            {/* Internal Notes (Stripped for driver role by serializer automatically) */}
            {order.internal_notes && (
              <div className="md:col-span-2 pt-4 border-t border-border-light/40 flex items-start gap-3 bg-rose-50/20 p-4 rounded-2xl border border-rose-100/50">
                <FileText className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <span className="block text-[9px] font-bold text-rose-600 uppercase tracking-wider">Internal Operations Notes</span>
                  <p className="text-xs font-semibold text-dark-text mt-0.5 leading-relaxed italic">{order.internal_notes}</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* CHRONOLOGICAL TIMELINE */}
      <div className="bg-white rounded-[2rem] border border-border-light shadow-xl p-8 sm:p-12 text-left">
        <h3 className="text-lg font-bold text-dark-text tracking-tight mb-8 flex items-center gap-3">
          <History className="w-5 h-5 text-primary-dark" />
          Shipment Journey Timeline
        </h3>

        <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 ml-4">
          {timeline.map((item, idx) => (
            <div key={idx} className="relative">
              {/* timeline point dot */}
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-dark" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
                <h4 className="text-sm font-bold text-dark-text flex items-center gap-2">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-gray leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Operator: {item.operator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ASSIGN / REASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4">Assign Delivery Executive</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Active Courier Executive</label>
                <SearchableCourierSelector
                  value={selectedDriverId}
                  onChange={setSelectedDriverId}
                  initialCourierName={selectedDriverId === order.assigned_employee ? order.assigned_employee_name : ""}
                />
              </div>

              {order.assigned_employee && (
                <div>
                  <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Reassignment Reason</label>
                  <select
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm font-semibold cursor-pointer outline-none focus:border-primary"
                  >
                    <option value="Employee On Leave">Employee On Leave</option>
                    <option value="High Workload">High Workload</option>
                    <option value="Wrong Assignment">Wrong Assignment</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleAssignSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#0F6E56] hover:bg-[#0c5946] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4">Cancel Shipment Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">Reason for Cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 h-11 rounded-xl border border-border-light bg-white text-sm font-semibold cursor-pointer outline-none focus:border-primary"
                >
                  <option value="Customer Cancelled">Customer Cancelled</option>
                  <option value="Incorrect Destination Address">Incorrect Destination Address</option>
                  <option value="SLA Breach Expected">SLA Breach Expected</option>
                  <option value="Duplicate Order">Duplicate Order</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border-light/60">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border-light hover:bg-slate-50 text-xs font-bold text-dark-text cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelSubmit}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Cancel Shipment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
