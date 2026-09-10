import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  getOperationsDashboard, 
  getOperationsTeamOverview, 
  getOperationsLeaderboard,
  getOperationsCharts,
  bulkAssignOrders,
  updateOrderStatus
} from "../../services/ordersService";
import { listEmployees } from "../company-admin/employees/services/employeeService";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  PlusCircle, 
  MapPin, 
  Users, 
  UserCheck, 
  ShieldAlert, 
  BarChart3, 
  RefreshCw,
  Search,
  Activity,
  Award,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function OperationsDashboard() {
  const navigate = useNavigate();

  // Primary API states
  const [dashboardData, setDashboardData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab views state (Dispatch Queue / Team Workloads / Alerts Exception Center)
  const [activeTab, setActiveTab] = useState("queue"); 
  
  // Search state inside tables
  const [driverSearch, setDriverSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  // Bulk assignment state
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [dash, team, leader, charts] = await Promise.all([
        getOperationsDashboard(),
        getOperationsTeamOverview(),
        getOperationsLeaderboard(),
        getOperationsCharts()
      ]);

      setDashboardData(dash);
      setTeamData(team);
      setLeaderboardData(leader);
      setChartsData(charts);
    } catch (err) {
      toast.error("Failed to load operations dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load active drivers if launching bulk assign selector
  const handleOpenBulkModal = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Please select at least one dispatch order.");
      return;
    }
    try {
      const res = await listEmployees("", "employee", "true", 1);
      setActiveDrivers(res.results || []);
      setShowBulkModal(true);
    } catch (err) {
      toast.error("Failed to load active drivers list.");
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (!selectedDriverId) {
      toast.error("Please select a courier driver.");
      return;
    }
    try {
      await bulkAssignOrders(selectedOrderIds, selectedDriverId);
      toast.success("Orders successfully bulk assigned!");
      setShowBulkModal(false);
      setSelectedOrderIds([]);
      loadData(true);
    } catch (err) {
      toast.error("Bulk assignment failed.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 text-left animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-10 bg-slate-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-white border border-border-light rounded-3xl p-6"></div>
          ))}
        </div>
        <div className="h-96 bg-white border border-border-light rounded-3xl p-8"></div>
      </div>
    );
  }

  // Derived vars
  const cards = dashboardData?.summary_cards || {};
  const metrics = dashboardData?.performance_metrics || {};
  const activities = dashboardData?.recent_activities || [];
  const dispatchQueue = dashboardData?.dispatch_queue || {};
  const exceptions = dashboardData?.exceptions || {};

  // Filter queues
  const filteredPending = (dispatchQueue.pending_orders || []).filter(o => 
    o.tracking_id.toLowerCase().includes(queueSearch.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(queueSearch.toLowerCase())
  );

  const filteredUrgent = (dispatchQueue.urgent_orders || []).filter(o => 
    o.tracking_id.toLowerCase().includes(queueSearch.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(queueSearch.toLowerCase())
  );

  // Filter leaderboard/partners
  const filteredPartners = leaderboardData.filter(p => 
    p.employee_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    p.availability.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left animate-fade-in pb-16">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-light/55 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-text tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-[#0F6E56]" />
            Operations Dispatch Hub
          </h1>
          <p className="text-muted-gray mt-1 text-sm">
            Logistics Control Center. Coordinate dispatches, SLA timelines, exceptions, and drivers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            className="p-3 bg-white border border-border-light hover:border-[#0F6E56]/30 rounded-xl text-dark-text shadow-sm transition-all hover:bg-slate-50 cursor-pointer"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#0F6E56]" : ""}`} />
          </button>
          <Link
            to="/orders/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0F6E56] to-[#0c5946] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Dispatch
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Today's Total" value={cards.today_orders} icon={<Package className="text-indigo-600" />} onClick={() => navigate("/operations/orders")} />
        <StatCard title="Delivered Today" value={cards.delivered_today} icon={<CheckCircle2 className="text-primary-dark" />} onClick={() => navigate("/operations/orders?status=Delivered")} />
        <StatCard title="Pending Queue" value={cards.pending} icon={<Clock className="text-amber-600" />} onClick={() => navigate("/operations/orders?status=Pending")} />
        <StatCard title="In Transit" value={cards.in_transit} icon={<TrendingUp className="text-teal-600" />} onClick={() => navigate("/operations/orders?status=In Transit")} />
        <StatCard title="SLA Near breaches" value={metrics.orders_near_sla} icon={<AlertTriangle className="text-orange-600" />} highlight={metrics.orders_near_sla > 0} onClick={() => navigate("/operations/orders")} />
      </div>

      {/* TEAM OVERVIEW utilization section */}
      {teamData && (
        <div className="bg-white border border-border-light/65 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F6E56]" />
              Workforce Overview
            </h3>
            <p className="text-xs text-muted-gray mt-1">Real-time driver availability capacity and daily dispatch rate.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 flex-1 max-w-4xl text-center md:text-left">
            <div className="border-r border-border-light/40 last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Available</span>
              <span className="text-xl font-extrabold text-[#0F6E56]">{teamData.available}</span>
            </div>
            <div className="border-r border-border-light/40 last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Busy</span>
              <span className="text-xl font-extrabold text-amber-600">{teamData.busy}</span>
            </div>
            <div className="border-r border-border-light/40 last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Offline</span>
              <span className="text-xl font-extrabold text-slate-400">{teamData.inactive}</span>
            </div>
            <div className="border-r border-border-light/40 last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Blocked</span>
              <span className="text-xl font-extrabold text-red-500">{teamData.blocked}</span>
            </div>
            <div className="border-r border-border-light/40 last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Assigned Today</span>
              <span className="text-xl font-extrabold text-indigo-700">{teamData.orders_assigned_today}</span>
            </div>
            <div className="last:border-none px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Completed</span>
              <span className="text-xl font-extrabold text-primary-dark">{teamData.deliveries_completed_today}</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION PANEL */}
      <div className="bg-[#FAFDFB] border border-primary/10 rounded-[2rem] p-6">
        <h3 className="text-sm font-black text-[#0F6E56] uppercase tracking-wider mb-4">Operations Playbook Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigate("/orders/create")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-slate-50 text-dark-text font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Create Order
          </button>
          {/* <button 
            onClick={() => navigate("/operations/orders?status=Pending")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-slate-50 text-dark-text font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Assign Orders
          </button> */}
          {/* <button 
            onClick={() => navigate("/operations/orders?status=Pending")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-slate-50 text-dark-text font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Bulk Assign Orders
          </button> */}
          {/* <button 
            onClick={() => navigate("/operations/orders?status=Pending")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-slate-50 text-dark-text font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Pending Orders
          </button> */}
          {/* <button 
            onClick={() => navigate("/operations/orders")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-slate-50 text-dark-text font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Delayed Orders
          </button> */}
          {/* <button 
            onClick={() => navigate("/operations/orders?status=Failed")}
            className="px-4 py-2.5 bg-white border border-border-light hover:border-primary/20 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer font-bold"
          >
            Failed Deliveries
          </button> */}
          <button 
            onClick={() => navigate("/dashboard/employees")}
            className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0c5946] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer font-bold"
          >
            Manage Delivery Partners
          </button>
          {selectedOrderIds.length > 0 && (
            <button 
              onClick={handleOpenBulkModal}
              className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0c5946] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 animate-bounce"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Assign Selected ({selectedOrderIds.length})
            </button>
          )}
        </div>
      </div>

      {/* METRIC PERFORMANCE INDEX */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white border border-border-light rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-dark-text uppercase tracking-wider mb-2">Operational Performance Index</h3>
            <p className="text-xs text-muted-gray">Dispatch service levels and average turnaround durations.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Delivery Time</span>
              <h4 className="text-lg font-extrabold text-dark-text mt-1">
                {metrics.average_delivery_seconds > 0 
                  ? `${Math.round(metrics.average_delivery_seconds / 3600)} Hours`
                  : "N/A"}
              </h4>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Assignment Duration</span>
              <h4 className="text-lg font-extrabold text-dark-text mt-1">
                {metrics.average_assignment_seconds > 0 
                  ? `${Math.round(metrics.average_assignment_seconds / 60)} Mins`
                  : "N/A"}
              </h4>
            </div>
            <div className="bg-[#EBF7F4] rounded-2xl p-4 border border-[#D5EFEA]">
              <span className="text-[10px] font-bold text-[#0F6E56] uppercase">Success Drop Rate</span>
              <h4 className="text-xl font-black text-[#0c5946] mt-1">{metrics.delivery_success_rate}%</h4>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Failure Bounce Rate</span>
              <h4 className="text-xl font-black text-rose-700 mt-1">{metrics.failure_rate}%</h4>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE */}
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm max-h-[300px] overflow-y-auto">
          <h3 className="text-sm font-black text-dark-text uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0F6E56]" />
            Control Activity Logs
          </h3>
          <div className="space-y-4">
            {activities.map((act) => (
              <div 
                key={act.id} 
                onClick={() => navigate(`/dashboard/orders/${act.order_id}`)}
                className="text-xs space-y-0.5 border-b border-border-light/35 pb-2 last:border-none cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all"
                title="Click to view shipment details"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-dark-text hover:text-primary">{act.tracking_id}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-muted-gray">{act.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS PREPARATION / STATUS DISTRIBUTION WIDGET */}
      {chartsData && (
        <div className="bg-white border border-border-light rounded-[2rem] p-6 shadow-sm text-left">
          <h3 className="text-sm font-black text-dark-text uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0F6E56]" />
            Dispatch Queue Distribution Metrics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Priorities bar charts */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Load Volume by Status</h4>
              <div className="space-y-3">
                {Object.entries(chartsData.status_distribution || {}).map(([status, cnt]) => (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-dark-text">{status}</span>
                      <span className="text-slate-400">{cnt} Orders</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full" 
                        style={{ width: `${Math.min((cnt / Math.max(...Object.values(chartsData.status_distribution || {1:1}))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priorities Distribution chart */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Load Volume by Priority SLA</h4>
              <div className="space-y-3">
                {Object.entries(chartsData.priority_distribution || {}).map(([prio, cnt]) => (
                  <div key={prio} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-dark-text">{prio} Priority</span>
                      <span className="text-slate-400">{cnt} Orders</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" 
                        style={{ width: `${Math.min((cnt / Math.max(...Object.values(chartsData.priority_distribution || {1:1}))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS INTERACTIVE CONTROL MODULE */}
      <div className="bg-white border border-border-light rounded-[2rem] overflow-hidden shadow-sm hover:border-primary/10 transition-all">
        
        {/* Tabs Headers */}
        <div className="flex border-b border-border-light/60 bg-bg-tint/30">
          {/* <TabButton active={activeTab === "queue"} onClick={() => setActiveTab("queue")} label="Dispatches Queue" /> */}
          <TabButton active={activeTab === "workloads"} onClick={() => setActiveTab("workloads")} label="Delivery Partner Workloads" />
          <TabButton active={activeTab === "exceptions"} onClick={() => setActiveTab("exceptions")} label="Exception Center" />
        </div>

        {/* Tab Body */}
        <div className="p-6">
          
          {/* TAB 1: DISPATCH QUEUE */}
          {activeTab === "queue" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-dark-text">Pending Order Dispatches</h4>
                  <p className="text-xs text-muted-gray mt-0.5">Check and select orders to assign delivery partners.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search queue list..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-light bg-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              {filteredPending.length === 0 && filteredUrgent.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                  No pending dispatches found. All orders assigned!
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending assignments table */}
                  {filteredPending.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 uppercase text-[9px] font-bold text-slate-400 border-b border-border-light">
                          <tr>
                            <th className="p-3 w-8 text-center">
                              <input 
                                type="checkbox" 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(filteredPending.map(o => o.id));
                                  } else {
                                    setSelectedOrderIds([]);
                                  }
                                }}
                                checked={selectedOrderIds.length === filteredPending.length && filteredPending.length > 0}
                              />
                            </th>
                            <th className="p-3">Tracking ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">SLA Expected</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light/45">
                          {filteredPending.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/50">
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedOrderIds.includes(ord.id)}
                                  onChange={() => {
                                    setSelectedOrderIds(prev => 
                                      prev.includes(ord.id) ? prev.filter(x => x !== ord.id) : [...prev, ord.id]
                                    );
                                  }}
                                />
                              </td>
                              <td className="p-3 font-mono font-bold text-primary-dark">{ord.tracking_id}</td>
                              <td className="p-3 font-bold text-dark-text">{ord.customer_name}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                  ord.priority === "Urgent" ? "bg-red-50 border-red-200 text-red-700" :
                                  ord.priority === "High" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                  "bg-slate-50 border-slate-200 text-slate-600"
                                }`}>
                                  {ord.priority}
                                </span>
                              </td>
                              <td className="p-3 text-muted-gray">{new Date(ord.expected_delivery_date).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <Link to={`/dashboard/orders/${ord.id}`} className="text-primary hover:text-primary-dark font-bold">
                                  Assign
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Urgent Queue alerts */}
                  {filteredUrgent.length > 0 && (
                    <div className="bg-red-50/20 border border-red-100 rounded-2xl p-4">
                      <h5 className="text-xs font-extrabold text-red-700 uppercase mb-3 flex items-center gap-1">
                        <ShieldAlert className="w-4 h-4" /> Urgent Action Required (High Priority Queue)
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredUrgent.map(ord => (
                          <div key={ord.id} className="bg-white border border-red-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
                            <div>
                              <span className="font-mono font-bold text-xs text-red-700">{ord.tracking_id}</span>
                              <p className="text-xs font-bold text-dark-text mt-0.5">{ord.customer_name}</p>
                            </div>
                            <button 
                              onClick={() => navigate(`/dashboard/orders/${ord.id}`)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer"
                            >
                              Dispatch Now
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEAM WORKLOADS */}
          {activeTab === "workloads" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-dark-text">Delivery Partner Utilization Roster</h4>
                  <p className="text-xs text-muted-gray mt-0.5">Track workforce availability, workload counts, and success rankings.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search drivers..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-light bg-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase text-[9px] font-bold text-slate-400 border-b border-border-light">
                    <tr>
                      <th className="p-3">Executive Partner</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Active Loads</th>
                      <th className="p-3 text-center">Assigned Today</th>
                      <th className="p-3 text-center">Completed Drops</th>
                      <th className="p-3 text-center">SLA Success Rate</th>
                      <th className="p-3 text-center">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light/45">
                    {filteredPartners.map((drv) => (
                      <tr 
                        key={drv.id} 
                        onClick={() => navigate(`/dashboard/employees/${drv.id}`)}
                        className="hover:bg-slate-100/80 cursor-pointer transition-colors"
                        title="Click to view driver performance details"
                      >
                        <td className="p-3">
                          <div className="font-bold text-dark-text hover:text-primary transition-colors">{drv.employee_name}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            drv.availability === "Available" ? "bg-primary/10 border-primary/20 text-primary-dark" :
                            drv.availability === "Busy" ? "bg-amber-50 border-amber-250 text-amber-700" :
                            "bg-slate-100 border-slate-350 text-slate-500"
                          }`}>
                            {drv.availability}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">{drv.active_orders}</td>
                        <td className="p-3 text-center font-bold text-slate-500">{drv.assigned_orders}</td>
                        <td className="p-3 text-center font-bold text-primary-dark">{drv.completed_orders}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-bold">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{drv.success_rate}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-muted-gray font-mono text-[10px]">
                          {drv.last_activity ? new Date(drv.last_activity).toLocaleTimeString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EXCEPTION CENTER */}
          {activeTab === "exceptions" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-dark-text flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5" /> Operational Exception Alerts
                </h4>
                <p className="text-xs text-muted-gray mt-0.5">Real-time alerts highlighting dispatches overdue or failed attempts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Delayed Orders List */}
                <div className="border border-border-light rounded-2xl p-4 bg-slate-50/50">
                  <h5 className="text-xs font-black text-dark-text uppercase mb-3 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500" /> Overdue Dispatch Deliveries
                  </h5>
                  {(exceptions.delayed_orders || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No delayed dispatches detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {(exceptions.delayed_orders || []).map((o) => (
                        <div key={o.id} className="bg-white border border-border-light p-3 rounded-xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="font-mono font-bold text-xs text-primary-dark">{o.tracking_id}</span>
                            <p className="text-xs text-muted-gray mt-0.5">SLA: {new Date(o.expected_delivery_date).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => navigate(`/dashboard/orders/${o.id}`)}
                            className="text-xs font-bold text-primary hover:text-primary-dark"
                          >
                            Trace
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Failed Deliveries List */}
                <div className="border border-border-light rounded-2xl p-4 bg-slate-50/50">
                  <h5 className="text-xs font-black text-dark-text uppercase mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Failed Delivery Runs
                  </h5>
                  {(exceptions.failed_orders || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No failed delivery attempts today.</p>
                  ) : (
                    <div className="space-y-2">
                      {(exceptions.failed_orders || []).map((o) => (
                        <div key={o.id} className="bg-white border border-border-light p-3 rounded-xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="font-mono font-bold text-xs text-red-600">{o.tracking_id}</span>
                            <p className="text-[10px] text-red-700 font-bold uppercase mt-0.5">Attempts: {o.attempt_count}</p>
                          </div>
                          <button 
                            onClick={() => navigate(`/dashboard/orders/${o.id}`)}
                            className="text-xs font-bold text-primary hover:text-primary-dark"
                          >
                            Reassign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* BULK ASSIGN MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border-light shadow-2xl p-6 w-full max-w-md animate-scale-in text-left">
            <h3 className="text-lg font-bold text-dark-text mb-4">Bulk Dispatch Assignments</h3>
            <p className="text-xs text-muted-gray mb-6">Select an active delivery partner to assign {selectedOrderIds.length} orders.</p>
            
            <div className="space-y-4">
              <label className="block text-xs font-bold text-dark-text uppercase tracking-wider">Active Courier Driver</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full px-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none text-sm font-semibold text-dark-text cursor-pointer"
              >
                <option value="">Select Delivery Driver</option>
                {activeDrivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>{drv.full_name}</option>
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
                onClick={handleBulkAssignSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#0F6E56] hover:bg-[#0c5946] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Assign Batches
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, value, icon, onClick, highlight = false }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-3xl border ${highlight ? "border-orange-200 bg-orange-50/20" : "border-border-light"} p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? "cursor-pointer hover:border-[#0F6E56]/30 hover:bg-slate-50/25" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">{title}</p>
        <div className="w-7 h-7 rounded-full border border-border-light bg-slate-50/50 flex items-center justify-center text-xs">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <h2 className="text-2xl font-black text-dark-text tracking-tight">{value}</h2>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 font-bold text-xs uppercase tracking-wider transition-all duration-200 border-r border-border-light/35 last:border-none cursor-pointer outline-none ${
        active 
          ? "bg-white text-[#0F6E56] border-b-2 border-b-[#0F6E56]" 
          : "text-muted-gray hover:text-dark-text hover:bg-bg-tint/30"
      }`}
    >
      {label}
    </button>
  );
}