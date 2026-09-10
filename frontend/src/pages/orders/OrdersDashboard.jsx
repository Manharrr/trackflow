import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOrderDashboard } from "../../services/ordersService";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  PlusCircle, 
  MapPin 
} from "lucide-react";
import toast from "react-hot-toast";

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getOrderDashboard();
        setData(res);
      } catch (err) {
        toast.error("Failed to load orders dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse text-left">
        <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white border border-border-light rounded-3xl p-6"></div>
          ))}
        </div>
        <div className="h-64 bg-white border border-border-light rounded-3xl p-6"></div>
      </div>
    );
  }

  if (!data) return null;

  const isAdmin = data.role === "company_admin";
  const isOM = data.role === "operations_manager";
  const isDriver = data.role === "employee";

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-dark" />
            Logistics Command Center
          </h1>
          <p className="text-muted-gray mt-1 text-sm">
            {isAdmin && "Company-wide dispatch performance, SLAs, and order metrics."}
            {isOM && "Manage logistics lifecycle, driver dispatch assignments, and notes."}
            {isDriver && "Your assigned delivery checklist, status updates, and milestones."}
          </p>
        </div>

        {isOM && (
          <Link
            to="/orders/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-primary/15 transition-all duration-200 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Dispatch
          </Link>
        )}
      </div>

      {/* ADMIN METRICS PANEL */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Shipment Orders"
            value={data.total_orders}
            icon={<Package className="w-5 h-5 text-indigo-600" />}
            bgClass="bg-indigo-50 border-indigo-100"
            desc="All dispatches mapped"
          />
          <StatCard
            title="Completed Deliveries"
            value={data.completed}
            icon={<CheckCircle2 className="w-5 h-5 text-primary-dark" />}
            bgClass="bg-primary/10 border-primary/20"
            desc="Successfully landed items"
          />
          <StatCard
            title="Pending Actions"
            value={data.pending}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            bgClass="bg-amber-50 border-amber-100"
            desc="Awaiting dispatch routing"
          />
          <StatCard
            title="Cancelled Shipments"
            value={data.cancelled}
            icon={<XCircle className="w-5 h-5 text-rose-600" />}
            bgClass="bg-rose-50 border-rose-100"
            desc="Aborted order runs"
          />
          <StatCard
            title="Failed Delivery Attempts"
            value={data.failed}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            bgClass="bg-red-50 border-red-100"
            desc="Requires warehouse reassignment"
          />
          <StatCard
            title="Delayed Shipments"
            value={data.delayed}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            bgClass="bg-orange-50 border-orange-100"
            desc="Breached expected timeline"
          />
          <div className="bg-white rounded-3xl border border-border-light p-6 shadow-sm col-span-1 sm:col-span-2 lg:col-span-3 flex items-center justify-between">
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Average Delivery Time</p>
              <h2 className="text-2xl font-black text-dark-text mt-1">
                {data.average_delivery_seconds > 0 
                  ? `${Math.round(data.average_delivery_seconds / 3600)} Hours`
                  : "N/A"}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-primary-dark">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS MANAGER METRICS */}
      {isOM && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Today's Dispatches"
            value={data.today_orders}
            icon={<Package className="w-5 h-5 text-indigo-600" />}
            bgClass="bg-indigo-50 border-indigo-100"
            desc="Created in last 24h"
          />
          <StatCard
            title="Pending Assignments"
            value={data.pending}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            bgClass="bg-amber-50 border-amber-100"
            desc="Unassigned courier loads"
          />
          <StatCard
            title="Assigned Courier Runs"
            value={data.assigned}
            icon={<CheckCircle2 className="w-5 h-5 text-primary-dark" />}
            bgClass="bg-primary/10 border-primary/20"
            desc="Active drivers en route"
          />
          <StatCard
            title="Delayed Shipments"
            value={data.delayed}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            bgClass="bg-orange-50 border-orange-100"
            desc="Delayed courier dispatches"
          />
        </div>
      )}

      {/* DRIVER METRICS PANEL */}
      {isDriver && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Assigned Shipment Loads"
            value={data.assigned_orders}
            icon={<Package className="w-5 h-5 text-indigo-600" />}
            bgClass="bg-indigo-50 border-indigo-100"
            desc="Active loads assigned to you"
          />
          <StatCard
            title="Completed Deliveries Today"
            value={data.completed_today}
            icon={<CheckCircle2 className="w-5 h-5 text-primary-dark" />}
            bgClass="bg-primary/10 border-primary/20"
            desc="Successfully dropped today"
          />
          <StatCard
            title="Pending Pickup / Run"
            value={data.pending}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            bgClass="bg-amber-50 border-amber-100"
            desc="Pending drop-offs"
          />
          <StatCard
            title="Expected Drop-offs Today"
            value={data.today_deliveries}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            bgClass="bg-orange-50 border-orange-100"
            desc="SLA scheduled for today"
          />
        </div>
      )}

      {/* HIGH PRIORITY ORDERS LIST (For Admins & Operations) */}
      {!isDriver && data.high_priority_orders && data.high_priority_orders.length > 0 && (
        <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden hover:border-primary/10 transition-all duration-300">
          <div className="p-6 border-b border-border-light/60 flex items-center justify-between bg-bg-tint/30">
            <div>
              <h2 className="text-lg font-bold text-dark-text tracking-tight">Priority Escalation Alerts</h2>
              <p className="text-xs text-muted-gray">Pending orders flagged with High or Urgent SLA priorities.</p>
            </div>
            <Link to="/dashboard/orders" className="text-xs font-bold text-primary hover:text-primary-dark">
              View All Orders
            </Link>
          </div>
          <div className="divide-y divide-border-light/50">
            {data.high_priority_orders.map((order) => (
              <div key={order.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-bg-tint/10 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary-dark">{order.tracking_id}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      order.priority === "Urgent" 
                        ? "bg-red-50 border-red-200 text-red-700" 
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      {order.priority}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-dark-text">{order.customer_name} &bull; {order.customer_phone}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-gray">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {order.delivery_address}</span>
                  <button 
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    className="px-3.5 py-1.5 rounded-xl border border-border-light hover:border-primary/20 text-dark-text font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, bgClass, desc }) {
  return (
    <div className="bg-white rounded-3xl border border-border-light p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${bgClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-3xl font-black text-dark-text tracking-tight">{value}</h2>
        <p className="text-[10px] text-muted-gray mt-1">{desc}</p>
      </div>
    </div>
  );
}
