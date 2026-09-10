import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  listEmployees, 
  activateEmployee, 
  deactivateEmployee 
} from "./services/employeeService";
import { 
  getOperationsTeamOverview, 
  getOperationsLeaderboard 
} from "../../../services/ordersService";
import { useAuth } from "../../../contexts/AuthContext";
import { 
  Users, 
  UserPlus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  UserMinus, 
  UserCheck 
} from "lucide-react";
import toast from "react-hot-toast";

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userRole = user?.role || user?.user?.role || "employee";
  const isOM = userRole === "operations_manager";
  const isCA = userRole === "company_admin";

  // State parameters
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeDrivers: 0,
    topEmployeeName: "N/A",
    completedToday: 0,
    totalToday: 0
  });

  // Fetch employee list
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await listEmployees(search, role, isActive, page);
      setEmployees(res.results || []);
      setCount(res.count || 0);
    } catch (err) {
      toast.error("Failed to load employee list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, role, isActive, page]);

  // Fetch telemetry summary stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [team, leaderboard] = await Promise.all([
          getOperationsTeamOverview(),
          getOperationsLeaderboard()
        ]);
        
        let topName = "N/A";
        if (leaderboard && leaderboard.length > 0) {
          const sorted = [...leaderboard].sort((a, b) => b.success_rate - a.success_rate || b.completed_orders - a.completed_orders);
          if (sorted[0]) {
            topName = sorted[0].full_name;
          }
        }

        setStats({
          totalEmployees: (team.available || 0) + (team.busy || 0) + (team.offline || 0) + (team.blocked || 0),
          activeDrivers: (team.available || 0) + (team.busy || 0),
          topEmployeeName: topName,
          completedToday: team.completed_today || 0,
          totalToday: team.assigned_today || 0
        });
      } catch (err) {
        // Fallback silently
      }
    };
    loadStats();
  }, []);

  // Handle status toggling
  const handleToggleStatus = async (employee) => {
    try {
      if (employee.is_active) {
        await deactivateEmployee(employee.id);
        toast.success(`Employee ${employee.full_name} deactivated successfully.`);
      } else {
        await activateEmployee(employee.id);
        toast.success(`Employee ${employee.full_name} activated successfully.`);
      }
      fetchEmployees();
    } catch (err) {
      toast.error("Failed to change employee status.");
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(count / 10);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-dark" />
            Employee Directory
          </h1>
          <p className="text-muted-gray mt-1 text-sm">
            Manage company delivery drivers, operations managers, and status profiles.
          </p>
        </div>

        {isCA && (
          <Link
            to="/dashboard/employees/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-primary/15 transition-all duration-200 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Onboard Employee
          </Link>
        )}
      </div>

      {/* ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-border-light p-5 flex flex-col justify-between shadow-sm hover:border-primary/10 transition-all duration-300">
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Workforce</span>
            <h2 className="text-2xl font-black text-dark-text mt-1.5">{stats.totalEmployees || employees.length}</h2>
          </div>
          <p className="text-[10px] text-muted-gray mt-2">Registered employee accounts</p>
        </div>

        <div className="bg-white rounded-3xl border border-border-light p-5 flex flex-col justify-between shadow-sm hover:border-primary/10 transition-all duration-300">
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Partners</span>
            <h2 className="text-2xl font-black text-[#0F6E56] mt-1.5">{stats.activeDrivers}</h2>
          </div>
          <p className="text-[10px] text-muted-gray mt-2">Active courier executives online</p>
        </div>

        <div className="bg-white rounded-3xl border border-border-light p-5 flex flex-col justify-between shadow-sm hover:border-primary/10 transition-all duration-300">
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Top Executive</span>
            <h2 className="text-sm font-black text-indigo-700 mt-2.5 truncate">{stats.topEmployeeName}</h2>
          </div>
          <p className="text-[10px] text-muted-gray mt-2">Highest dispatch success rate today</p>
        </div>

        <div className="bg-white rounded-3xl border border-border-light p-5 flex flex-col justify-between shadow-sm hover:border-primary/10 transition-all duration-300">
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Today's Target</span>
            <h2 className="text-2xl font-black text-amber-600 mt-1.5">{stats.completedToday} / {stats.totalToday}</h2>
          </div>
          <p className="text-[10px] text-muted-gray mt-2">Deliveries completed today</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Search Field */}
        <div className="relative w-full md:flex-1">
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

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="relative flex-1 md:w-44">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-xs font-bold text-dark-text appearance-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="employee">Employee</option>
              <option value="operations_manager">Operations Manager</option>
              <option value="company_admin">Company Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 md:w-44">
            <select
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 h-11 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-xs font-bold text-dark-text appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden hover:border-primary/10 transition-all duration-300">
        {loading ? (
          <div className="p-16 text-center space-y-4">
            <svg className="animate-spin h-8 w-8 text-primary mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-400 font-semibold text-sm">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-bg-tint border border-border-light flex items-center justify-center mx-auto mb-4 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-dark-text text-base">No employees found</h3>
            <p className="text-xs text-muted-gray mt-1">Try resetting your search query or status filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tint/40 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-border-light/60">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Phone</th>
                  <th className="p-4 text-left">Designation</th>
                  <th className="p-4 text-left">Role</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Joined Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50 text-muted-gray">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-bg-tint/20 transition-colors">
                    <td className="p-4 font-bold text-dark-text">
                      {emp.full_name}
                    </td>
                    <td className="p-4 font-medium text-xs">
                      {emp.phone}
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {emp.designation || "N/A"}
                    </td>
                    <td className="p-4 text-xs font-bold capitalize">
                      {emp.role.replace("_", " ")}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        emp.is_active 
                          ? "bg-primary/10 border-primary/20 text-primary-dark"
                          : "bg-rose-50 border-rose-200 text-rose-700"
                      }`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium">
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => navigate(`/dashboard/employees/${emp.id}`)}
                          className="p-2 bg-white border border-border-light hover:border-primary/20 hover:bg-bg-tint/50 text-dark-text rounded-xl shadow-sm transition-all cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Status Toggle */}
                        {((emp.role === "employee" && (isCA || isOM)) || (emp.role === "operations_manager" && isCA)) && (
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            className={`p-2 border rounded-xl shadow-sm transition-all cursor-pointer ${
                              emp.is_active 
                                ? "bg-white border-border-light hover:border-rose-200 hover:bg-rose-50 text-rose-600" 
                                : "bg-white border-border-light hover:border-primary/25 hover:bg-primary/5 text-primary"
                            }`}
                            title={emp.is_active ? "Deactivate User" : "Activate User"}
                          >
                            {emp.is_active ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
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

      {/* Pagination controls */}
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
    </div>
  );
}
