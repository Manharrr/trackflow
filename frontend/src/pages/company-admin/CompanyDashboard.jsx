import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrderDashboard } from "../../services/ordersService";
import { useAuth } from "../../contexts/AuthContext";
import { 
  ClipboardList, 
  Users, 
  Milestone, 
  Coins, 
  ArrowRight, 
  UserPlus, 
  BarChart3, 
  UserCheck,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  const adminName = user?.full_name || user?.user?.full_name || "Administrator";

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await getOrderDashboard();
        setMetrics(res);
      } catch (err) {
        toast.error("Failed to load workspace dashboard.");
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
        <p className="text-slate-400 font-bold text-sm">Loading...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-24 text-slate-400 font-semibold">
        No dashboard data available for this company.
      </div>
    );
  }

  const completionRate = metrics.total_orders > 0 
    ? Math.round((metrics.completed / metrics.total_orders) * 100) 
    : 0;

  return (
    <div className="text-left space-y-8 animate-fade-in pb-16">
      
      {/* 1. HERO GREETING BANNER */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl border border-primary/20">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-6">
          <Zap className="w-96 h-96" />
        </div>
        <div className="relative space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider">
            Workspace Active
          </span>
          <h1 className="text-3xl font-black tracking-tight">
            Welcome back, {adminName}!
          </h1>
          <p className="text-sm text-teal-50 mt-1 leading-relaxed font-medium">
            TrackFlow is monitoring your tenant operations. Explore the workspace overview and telemetry controls below.
          </p>
        </div>
      </div>

      {/* 2. TOP 4 KEY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Orders"
          value={metrics.total_orders}
          icon={<ClipboardList className="w-5 h-5 text-indigo-650" />}
          bgClass="bg-indigo-50/70 border-indigo-100/50"
          onClick={() => navigate("/dashboard/orders")}
        />

        <Card
          title="Total Employees"
          value={metrics.total_employees}
          icon={<Users className="w-5 h-5 text-blue-655" />}
          bgClass="bg-blue-50/70 border-blue-100/50"
          onClick={() => navigate("/dashboard/employees")}
        />

        <Card
          title="Courier Partners"
          value={metrics.couriers_count}
          icon={<Milestone className="w-5 h-5 text-amber-655" />}
          bgClass="bg-amber-50/70 border-amber-100/50"
          onClick={() => navigate("/dashboard/employees")}
        />

        <Card
          title="Revenue"
          value={`₹${(metrics.revenue || 0).toLocaleString()}`}
          icon={<Coins className="w-5 h-5 text-primary-dark" />}
          bgClass="bg-primary/10 border-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. QUICK ACTIONS ROUTER PANEL */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Control Panel Quick Actions
            </h3>
            <p className="text-xs text-muted-gray mt-1">Direct navigations to command workspace modules.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ActionButton 
              title="Add Employee"
              desc="Onboard staff"
              icon={<UserPlus className="w-4 h-4 text-primary" />}
              onClick={() => navigate("/dashboard/employees/create")}
            />
            <ActionButton 
              title="Shipments"
              desc="Registry queue"
              icon={<ClipboardList className="w-4 h-4 text-indigo-600" />}
              onClick={() => navigate("/dashboard/orders")}
            />
            <ActionButton 
              title="Analytics"
              desc="Deep performance"
              icon={<BarChart3 className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate("/dashboard/analytics")}
            />
            <ActionButton 
              title="My Profile"
              desc="Account settings"
              icon={<UserCheck className="w-4 h-4 text-amber-600" />}
              onClick={() => navigate("/profile")}
            />
          </div>
        </div>

        {/* 4. TOTAL PROGRESS RATE OVERVIEW */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Overall Dispatch Delivery Rate
            </h3>
            <p className="text-xs text-muted-gray mt-1">Percentage ratio of successfully delivered dispatches.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-black text-dark-text">{completionRate}%</span>
                <span className="text-xs font-semibold text-muted-gray ml-2">Success Index</span>
              </div>
              <span className="text-xs font-black text-[#0F6E56]">{metrics.completed} / {metrics.total_orders} Drops</span>
            </div>
            
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-550" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase pt-4 border-t border-slate-100/60">
            <span>Online: {metrics.active_couriers} Couriers</span>
            <span>Avg delivery SLA: {metrics.average_delivery_seconds > 0 ? `${Math.round(metrics.average_delivery_seconds / 3600)}h` : "N/A"}</span>
          </div>
        </div>

      </div>

    </div>
  );
}

function Card({
  title,
  value,
  icon,
  bgClass,
  onClick
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-3xl border border-border-light p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 ${
        onClick ? "cursor-pointer hover:border-[#0F6E56]/20" : ""
      }`}
    >
      <div>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
          {title}
        </p>

        <h2 className="text-3xl font-black text-dark-text mt-2 tracking-tight">
          {value}
        </h2>
      </div>
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm ${bgClass}`}>
        {icon}
      </div>
    </div>
  );
}

function ActionButton({ title, desc, icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-4 border border-border-light hover:border-[#0F6E56]/20 bg-white rounded-2xl text-left hover:shadow-sm transition-all duration-200 cursor-pointer space-y-2 group"
    >
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-[#0F6E56]/5 transition-colors">
        {icon}
      </div>
      <div>
        <span className="block text-xs font-black text-dark-text">{title}</span>
        <span className="block text-[9px] text-muted-gray mt-0.5">{desc}</span>
      </div>
    </button>
  );
}