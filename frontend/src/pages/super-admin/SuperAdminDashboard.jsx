import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import toast from "react-hot-toast";
import { Building2, FileClock, CheckCircle, XCircle, ChevronRight, Inbox } from "lucide-react";

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/super-admin/dashboard/");
            setDashboard(res.data);
        } catch (err) {
            toast.error("Failed to load dashboard metrics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    // 1. Shimmer Loading Skeleton State
    if (loading || !dashboard) {
        return (
            <div className="space-y-8 animate-pulse text-left">
                <div>
                    <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded-lg w-64"></div>
                </div>

                {/* Shimmer Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border border-border-light rounded-3xl p-6 h-32 flex flex-col justify-between">
                            <div className="h-4 bg-slate-100 rounded w-24"></div>
                            <div className="h-8 bg-slate-200 rounded w-16"></div>
                        </div>
                    ))}
                </div>

                {/* Shimmer Table */}
                <div className="bg-white border border-border-light rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-6 bg-slate-200 rounded w-48"></div>
                        <div className="h-4 bg-slate-100 rounded w-16"></div>
                    </div>
                    <div className="space-y-3 pt-4">
                        {[1, 2, 3].map((row) => (
                            <div key={row} className="flex justify-between items-center py-3 border-b border-border-light/50">
                                <div className="h-5 bg-slate-100 rounded w-1/3"></div>
                                <div className="h-5 bg-slate-100 rounded w-20"></div>
                                <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in text-left">
            <div>
                <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-muted-gray mt-1.5 text-sm">
                    TrackFlow platform health, metrics, and pending tenant registration requests.
                </p>
            </div>

            {/* Metrics card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Workspaces"
                    value={dashboard.summary.total}
                    icon={<Building2 className="h-5 w-5 text-indigo-600" />}
                    bgClass="bg-indigo-50/70 border-indigo-100/50"
                />
                <Card
                    title="Pending Requests"
                    value={dashboard.summary.pending}
                    icon={<FileClock className="h-5 w-5 text-amber-600" />}
                    bgClass="bg-amber-50/70 border-amber-100/50"
                />
                <Card
                    title="Approved Domains"
                    value={dashboard.summary.approved}
                    icon={<CheckCircle className="h-5 w-5 text-primary-dark" />}
                    bgClass="bg-primary/10 border-primary/20"
                />
                <Card
                    title="Rejected Requests"
                    value={dashboard.summary.rejected}
                    icon={<XCircle className="h-5 w-5 text-rose-600" />}
                    bgClass="bg-rose-50/70 border-rose-100/50"
                />
            </div>

            {/* Recent requests table */}
            <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden hover:border-primary/10 transition-all duration-300">
                <div className="p-6 border-b border-border-light/60 flex justify-between items-center bg-bg-tint/30">
                    <div>
                        <h2 className="text-lg font-bold text-dark-text tracking-tight">
                            Recent Workspaces Requests
                        </h2>
                        <p className="text-xs text-muted-gray mt-0.5">Approval review requests queue.</p>
                    </div>
                    <button
                        onClick={() => navigate("/super-admin/companies")}
                        className="text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        View All
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {dashboard.recent.length === 0 ? (
                    // 2. Empty State View
                    <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center">
                        <div className="bg-bg-tint p-4 rounded-2xl text-slate-400 mb-4 shadow-inner">
                            <Inbox className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-bold text-dark-text text-base">No requests pending</h3>
                        <p className="text-xs text-muted-gray mt-1.5 leading-relaxed">
                            Any new registration proposals submitted by clients will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-bg-tint/40 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-border-light/60">
                                <tr>
                                    <th className="p-4.5">Company Name</th>
                                    <th className="p-4.5">Request Status</th>
                                    <th className="p-4.5 text-center w-32">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light/50 text-muted-gray">
                                {dashboard.recent.map((company) => (
                                    <tr key={company.id} className="hover:bg-bg-tint/30 transition-colors">
                                        <td className="p-4.5 font-bold text-dark-text">{company.name}</td>
                                        <td className="p-4.5">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border
                                                ${
                                                    company.status === "approved"
                                                        ? "bg-primary/10 border-primary/20 text-primary-dark"
                                                        : company.status === "pending"
                                                        ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                                                        : "bg-rose-50 border-rose-200 text-rose-700"
                                                }`}
                                            >
                                                {company.status}
                                            </span>
                                        </td>
                                        <td className="p-4.5 text-center">
                                            <button
                                                onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                                                className="bg-white border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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