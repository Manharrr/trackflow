import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import toast from "react-hot-toast";
import { Building2, Search, Filter, Plus, ArrowRight, Inbox, HelpCircle, X } from "lucide-react";

export default function CompaniesPage() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // id of current action

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");

    // Modal state for rejection reason
    const [rejectCompanyId, setRejectCompanyId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const loadCompanies = async () => {
        try {
            const res = await axiosInstance.get("/super-admin/companies/");
            setCompanies(res.data);
        } catch (err) {
            toast.error("Failed to retrieve company registrations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const approveCompany = async (id) => {
        try {
            setActionLoading(id);
            await axiosInstance.patch(`/super-admin/companies/${id}/approve/`);
            toast.success("Workspace approved! Schema generation initiated.");
            loadCompanies();
        } catch (err) {
            toast.error("Approval failed. Please check credentials.");
        } finally {
            setActionLoading(null);
        }
    };

    const submitRejection = async (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) {
            toast.error("Rejection reason is required.");
            return;
        }

        const id = rejectCompanyId;
        try {
            setActionLoading(id);
            await axiosInstance.patch(`/super-admin/companies/${id}/reject/`, {
                reason: rejectionReason,
            });
            toast.success("Company request rejected.");
            setRejectCompanyId(null);
            setRejectionReason("");
            loadCompanies();
        } catch (err) {
            toast.error("Rejection failed.");
        } finally {
            setActionLoading(null);
        }
    };

    const filteredCompanies = useMemo(() => {
        return companies.filter((company) => {
            const matchesSearch =
                company.name.toLowerCase().includes(search.toLowerCase()) ||
                company.email.toLowerCase().includes(search.toLowerCase()) ||
                company.schema_name.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = status === "all" ? true : company.status === status;

            return matchesSearch && matchesStatus;
        });
    }, [companies, search, status]);

    const totalCompanies = companies.length;
    const pendingCompanies = companies.filter((c) => c.status === "pending").length;
    const approvedCompanies = companies.filter((c) => c.status === "approved").length;
    const rejectedCompanies = companies.filter((c) => c.status === "rejected").length;

    // Loading Shimmer Skeletons
    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 h-28"></div>
                    ))}
                </div>

                <div className="h-12 bg-slate-100 rounded-xl w-full"></div>

                <div className="bg-white border border-slate-100 rounded-2xl h-80"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in relative">
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Companies
                    </h1>
                    <p className="text-slate-500 mt-1.5 text-sm">
                        Manage registered client workspaces and deployment requests.
                    </p>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Total companies</p>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{totalCompanies}</h2>
                </div>

                <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-amber-600/80 font-semibold text-xs uppercase tracking-wider">Pending approval</p>
                    <h2 className="text-2xl font-extrabold text-amber-700 mt-2">{pendingCompanies}</h2>
                </div>

                <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-emerald-600/80 font-semibold text-xs uppercase tracking-wider">Approved Active</p>
                    <h2 className="text-2xl font-extrabold text-emerald-700 mt-2">{approvedCompanies}</h2>
                </div>

                <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <p className="text-rose-600/80 font-semibold text-xs uppercase tracking-wider">Rejected</p>
                    <h2 className="text-2xl font-extrabold text-rose-700 mt-2">{rejectedCompanies}</h2>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                    />
                </div>

                <div className="relative w-full sm:w-48 shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Filter className="h-4 w-4" />
                    </div>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-teal-600 transition-all outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">All Registrations</option>
                        <option value="pending">Pending Queue</option>
                        <option value="approved">Approved Active</option>
                        <option value="rejected">Rejected Archive</option>
                    </select>
                </div>
            </div>

            {/* Companies Grid Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredCompanies.length === 0 ? (
                    // Search Empty State
                    <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center">
                        <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-4">
                            <Inbox className="h-8 w-8" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-base">No results found</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            No companies found matching search text or filter status.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
                                <tr>
                                    <th className="text-left p-4">Company Name</th>
                                    <th className="text-left p-4">Admin Email</th>
                                    <th className="text-left p-4">Phone Contact</th>
                                    <th className="text-left p-4">Subdomain</th>
                                    <th className="text-left p-4">Approval Status</th>
                                    <th className="text-center p-4 w-60">Actions Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-semibold text-slate-900">{company.name}</td>
                                        <td className="p-4">{company.email}</td>
                                        <td className="p-4">{company.phone}</td>
                                        <td className="p-4 font-mono text-xs">{company.schema_name}</td>
                                        <td className="p-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border
                                                ${
                                                    company.status === "approved"
                                                        ? "bg-green-50 border-green-200 text-green-700"
                                                        : company.status === "pending"
                                                        ? "bg-amber-50 border-amber-200 text-amber-700"
                                                        : "bg-rose-50 border-rose-200 text-rose-700"
                                                }`}
                                            >
                                                {company.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                                                    className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer shadow-sm"
                                                >
                                                    View
                                                </button>

                                                {company.status === "pending" && (
                                                    <>
                                                        <button
                                                            disabled={actionLoading === company.id}
                                                            onClick={() => approveCompany(company.id)}
                                                            className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg font-semibold text-xs shadow-sm shadow-teal-600/10 transition-all cursor-pointer disabled:opacity-50"
                                                        >
                                                            {actionLoading === company.id ? "..." : "Approve"}
                                                        </button>
                                                        <button
                                                            disabled={actionLoading === company.id}
                                                            onClick={() => setRejectCompanyId(company.id)}
                                                            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg font-semibold text-xs shadow-sm shadow-rose-600/10 transition-all cursor-pointer disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
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

            {/* Reject Modal Overlay */}
            {rejectCompanyId && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-slate-900">Reject Company Request</h3>
                            <button
                                onClick={() => {
                                    setRejectCompanyId(null);
                                    setRejectionReason("");
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={submitRejection} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    rows="4"
                                    placeholder="Please provide details explaining the decision..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full border border-slate-200 rounded-2xl p-4 bg-slate-50 text-sm focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                                    required
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRejectCompanyId(null);
                                        setRejectionReason("");
                                    }}
                                    className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-rose-600/10 transition-all cursor-pointer"
                                >
                                    Submit Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
