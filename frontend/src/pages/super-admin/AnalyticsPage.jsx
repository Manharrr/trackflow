import { useEffect, useState } from "react";
import axiosInstance from "../../api/axios";
import { 
  BarChart3, 
  Building2, 
  FileClock, 
  CheckCircle, 
  XCircle, 
  Zap, 
  TrendingUp 
} from "lucide-react";
import toast from "react-hot-toast";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/super-admin/dashboard/");
        setSummary(res.data.summary);
      } catch (err) {
        toast.error("Failed to load platform analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-24 space-y-4">
        <svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-400 font-bold text-sm">Loading platform analytics...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-24 text-slate-400 font-semibold">
        No platform analytics details available.
      </div>
    );
  }

  const approvalRate = summary.total > 0 
    ? Math.round((summary.approved / summary.total) * 100) 
    : 0;

  return (
    <div className="text-left space-y-8 animate-fade-in pb-16">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-indigo-600" />
          Platform Growth & Analytics
        </h1>
        <p className="text-muted-gray mt-1.5 text-sm">
          Global overview of tenant workspace metrics, onboarding pipeline approvals, and platform index.
        </p>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Workspaces"
          value={summary.total}
          icon={<Building2 className="w-5 h-5 text-indigo-650" />}
          bgClass="bg-indigo-50/70 border-indigo-100/50"
        />

        <Card
          title="Pending Requests"
          value={summary.pending}
          icon={<FileClock className="w-5 h-5 text-amber-655" />}
          bgClass="bg-amber-50/70 border-amber-100/50"
        />

        <Card
          title="Active Domains"
          value={summary.approved}
          icon={<CheckCircle className="w-5 h-5 text-primary-dark" />}
          bgClass="bg-primary/10 border-primary/20"
        />

        <Card
          title="Rejected Requests"
          value={summary.rejected}
          icon={<XCircle className="w-5 h-5 text-rose-655" />}
          bgClass="bg-rose-50/70 border-rose-100/50"
        />
      </div>

      {/* METRIC ANALYSIS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* WORKSPACE APPROVAL PERFORMANCE RATE */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Tenant Onboarding & Approval Index
            </h3>
            <p className="text-xs text-muted-gray mt-1">Percentage of approved tenant workspaces relative to total onboarding proposals.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-black text-dark-text">{approvalRate}%</span>
                <span className="text-xs font-semibold text-muted-gray ml-2">Platform Approval rate</span>
              </div>
              <span className="text-xs font-black text-[#0F6E56]">{summary.approved} Approved / {summary.total} Total</span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-650 rounded-full transition-all duration-550"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase pt-4 border-t border-slate-100/60">
            <span>Pending approvals: {summary.pending}</span>
            <span>Rejected proposals: {summary.rejected}</span>
          </div>
        </div>

        {/* HEALTH CHECK CHECKPOINTS */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider">
              Global Platform Insights
            </h3>
            <p className="text-xs text-muted-gray mt-1">Platform service indicators and telemetry logs.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold text-muted-gray">
            <div className="flex justify-between items-center py-2.5 border-b border-border-light/35">
              <span>Primary Schema Context</span>
              <span className="font-bold text-[#0F6E56]">Public Active</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-border-light/35">
              <span>Database Engines</span>
              <span className="font-bold text-dark-text">PostgreSQL 16</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-border-light/35">
              <span>Multi-Tenant Architecture</span>
              <span className="font-bold text-dark-text">Shared DB, Custom Schemas</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span>Platform Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary-dark border border-primary/20 animate-pulse">
                Healthy online
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function Card({ title, value, icon, bgClass }) {
  return (
    <div className="bg-white rounded-3xl border border-border-light p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{title}</p>
        <h2 className="text-3xl font-black text-dark-text mt-2 tracking-tight">{value}</h2>
      </div>
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm ${bgClass}`}>
        {icon}
      </div>
    </div>
  );
}