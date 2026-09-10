import { useEffect, useState } from "react";
import { getEmployeeDashboard } from "../company-admin/employees/services/employeeService";
import { ClipboardList, CheckCircle, Clock, Sparkles, History, User } from "lucide-react";
import toast from "react-hot-toast";

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getEmployeeDashboard();
        setData(res);
      } catch (err) {
        toast.error("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse text-left">
        <div>
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-slate-100 rounded-lg w-64"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-border-light rounded-3xl p-6 h-32 flex flex-col justify-between">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-border-light rounded-3xl p-6 h-64"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#061a15] to-[#0A2E25] rounded-[2rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-xl border border-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-dark/10 rounded-full blur-3xl opacity-40 -ml-10 -mb-10 pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-primary tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Executive Workspace
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Good Morning, {data.employee_name}
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base font-medium">
              Active with <strong className="text-white">{data.company_name}</strong> &bull; {data.current_date}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Assigned Orders"
          value={data.assigned_orders}
          icon={<ClipboardList className="w-5 h-5 text-indigo-600" />}
          bgClass="bg-indigo-50 border-indigo-100"
          desc="Today's total dispatches"
        />
        <Card
          title="Completed"
          value={data.completed_orders}
          icon={<CheckCircle className="w-5 h-5 text-primary-dark" />}
          bgClass="bg-primary/10 border-primary/20"
          desc="Successfully delivered"
        />
        <Card
          title="Pending"
          value={data.pending_orders}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          bgClass="bg-amber-50 border-amber-100"
          desc="In delivery queue"
        />
        <div className="bg-white rounded-3xl border border-border-light p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Profile Completion</p>
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-end justify-between mb-1.5">
              <h2 className="text-2xl font-black text-dark-text tracking-tight">{data.profile_completion}%</h2>
              <span className="text-[10px] font-bold text-primary tracking-wide">Complete</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500" 
                style={{ width: `${data.profile_completion}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden hover:border-primary/10 transition-all duration-300">
        <div className="p-6 border-b border-border-light/60 flex items-center gap-3 bg-bg-tint/30">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-dark-text tracking-tight">Recent Activity</h2>
            <p className="text-xs text-muted-gray">Track your latest task updates and portal actions.</p>
          </div>
        </div>

        <div className="divide-y divide-border-light/50">
          {data.recent_activity.map((activity) => (
            <div key={activity.id} className="p-6 flex items-start gap-4 hover:bg-bg-tint/20 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-primary/80 mt-1.5 shrink-0" />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-sm font-bold text-dark-text">{activity.description}</span>
                <span className="text-xs font-semibold text-slate-400 font-mono">{activity.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon, bgClass, desc }) {
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