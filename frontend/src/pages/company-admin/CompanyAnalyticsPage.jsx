import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrderDashboard } from "../../services/ordersService";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingDown, 
  ArrowRight 
} from "lucide-react";
import toast from "react-hot-toast";

export default function CompanyAnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await getOrderDashboard();
        setMetrics(res);
      } catch (err) {
        toast.error("Failed to load workspace analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-24 space-y-4">
        <svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-400 font-bold text-sm">Loading telemetry metrics...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-24 text-slate-400 font-semibold">
        No analytics data available for this company.
      </div>
    );
  }

  return (
    <div className="text-left space-y-8 animate-fade-in pb-16">
      
      {/* HEADER TITLE */}
      <div>
        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[#0F6E56]" />
          Operations & Performance Analytics
        </h1>
        <p className="text-muted-gray mt-1.5 text-sm">
          Deep-dive telemetry including order status distribution lifecycle, daily operations checkpoints, and SLA achievements.
        </p>
      </div>

      {/* DISPATCH TARGETS & DEMOGRAPHICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ORDER LIFECYCLE STATS */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Dispatch Order Lifecycle
            </h3>
            <p className="text-xs text-muted-gray mt-1">Status breakdown of all generated logistics runs.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <LifecycleCard title="Completed" value={metrics.completed} color="text-primary-dark" bg="bg-primary/5" icon={<CheckCircle2 className="w-4 h-4 text-primary-dark" />} />
            <LifecycleCard title="Pending" value={metrics.pending} color="text-amber-600" bg="bg-amber-50/50" icon={<Clock className="w-4 h-4 text-amber-600" />} />
            <LifecycleCard title="Delayed" value={metrics.delayed} color="text-orange-600" bg="bg-orange-50/50" icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} />
            <LifecycleCard title="Failed" value={metrics.failed} color="text-rose-600" bg="bg-rose-50/55" icon={<ShieldAlert className="w-4 h-4 text-rose-600" />} />
            <LifecycleCard title="Cancelled" value={metrics.cancelled} color="text-slate-450" bg="bg-slate-50" icon={<TrendingDown className="w-4 h-4 text-slate-450" />} />
          </div>
        </div>

        {/* WORKSPACE DEMOGRAPHICS */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Today's Targets & Insights
            </h3>
            <p className="text-xs text-muted-gray mt-1">Workspace operations index metrics logs.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold text-muted-gray">
            <div className="flex justify-between items-center py-2 border-b border-border-light/35">
              <span>Today's Dispatches</span>
              <span className="font-bold text-dark-text">{metrics.today_orders}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-light/35">
              <span>Last Month Volume</span>
              <span className="font-bold text-dark-text">{metrics.last_month_orders}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-light/35">
              <span>Operations Managers</span>
              <span className="font-bold text-dark-text">{metrics.managers_count}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-light/35">
              <span>Online/Active Drivers</span>
              <span className="font-bold text-primary-dark">{metrics.active_couriers}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Avg Delivery SLA</span>
              <span className="font-bold text-dark-text">
                {metrics.average_delivery_seconds > 0 
                  ? `${Math.round(metrics.average_delivery_seconds / 3600)} Hours`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT URGENT/HIGH DISPATCHES */}
      {metrics.high_priority_orders && metrics.high_priority_orders.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-border-light shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
                Critical Priority Dispatches
              </h3>
              <p className="text-xs text-muted-gray mt-1">High and urgent priority orders requiring immediate delivery partner oversight.</p>
            </div>
            <button 
              onClick={() => navigate("/dashboard/orders")}
              className="text-xs font-bold text-[#0F6E56] hover:text-[#0b5442] flex items-center gap-1 cursor-pointer transition-colors"
            >
              View Registry <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-450 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Tracking ID</th>
                  <th className="p-3">Recipient Customer</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Deadline Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {metrics.high_priority_orders.map((ord) => (
                  <tr 
                    key={ord.id}
                    onClick={() => navigate(`/dashboard/orders/${ord.id}`)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-[#0F6E56]">{ord.tracking_id}</td>
                    <td className="p-3 font-bold text-dark-text">{ord.customer_name}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase text-[8px] border ${
                        ord.priority === "Urgent" 
                          ? "bg-rose-50 border-rose-200 text-rose-700" 
                          : "bg-amber-50 border-amber-250 text-amber-700"
                      }`}>
                        {ord.priority}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{ord.status}</td>
                    <td className="p-3 font-medium">{ord.expected_delivery_date ? new Date(ord.expected_delivery_date).toLocaleString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function LifecycleCard({
  title,
  value,
  color,
  bg,
  icon
}) {
  return (
    <div className={`p-4 border border-border-light/70 rounded-2xl bg-white hover:shadow-sm transition-all duration-200 text-center flex flex-col items-center justify-center space-y-2`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <span className={`block text-lg font-black mt-0.5 ${color}`}>{value}</span>
      </div>
    </div>
  );
}
