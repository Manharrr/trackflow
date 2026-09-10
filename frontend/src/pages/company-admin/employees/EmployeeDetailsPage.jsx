import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmployeeDetails } from "./services/employeeService";
import { getOperationsLeaderboard } from "../../../services/ordersService";
import { chatApi } from "../../../features/chat/api/chatApi";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  PhoneCall, 
  Briefcase, 
  Award, 
  Calendar, 
  Clock, 
  Shield 
} from "lucide-react";
import toast from "react-hot-toast";

export default function EmployeeDetailsPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getEmployeeDetails(employeeId);
        setEmployee(data);

        // Fetch driver logistics performance indicators if employee role
        if (data.role === "employee") {
          try {
            const leaderboard = await getOperationsLeaderboard();
            const driverMetrics = leaderboard.find(item => item.id === employeeId);
            if (driverMetrics) {
              setMetrics(driverMetrics);
            }
          } catch (mErr) {
            // Silently ignore dashboard telemetry failures
          }
        }
      } catch (err) {
        toast.error("Failed to load employee details.");
      } finally {
        setLoading(false);
      }
    };
    if (employeeId) {
      fetchDetails();
    }
  }, [employeeId]);

  const handleStartMessage = async () => {
    try {
      const conv = await chatApi.createConversation(employeeId);
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      toast.error("Failed to start conversation.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse text-left">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="bg-white border border-border-light rounded-3xl p-8 h-96"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-slate-400 font-semibold">Employee not found.</p>
        <button onClick={() => navigate("/dashboard/employees")} className="mt-4 text-primary font-bold">
          Back to Directory
        </button>
      </div>
    );
  }

  const API_HOST = window.location.hostname;
  const photoUrl = employee.profile_image ? `http://${API_HOST}:8000${employee.profile_image}` : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left animate-fade-in">
      {/* Back navigation */}
      <div>
        <button
          onClick={() => navigate("/dashboard/employees")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-dark-text transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>
      </div>

      {/* Main Detail Container */}
      <div className="bg-white rounded-[2rem] border border-border-light shadow-xl overflow-hidden hover:border-primary/10 transition-all duration-300">
        
        {/* Header Color Band */}
        <div className="h-32 bg-gradient-to-r from-primary to-primary-dark relative">
          <div className="absolute top-4 right-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${
              employee.is_active 
                ? "bg-white border-primary/20 text-primary-dark"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              {employee.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Profile Card Banner */}
        <div className="px-8 sm:px-12 pb-8 relative">
          
          {/* Profile Photo Wrapper */}
          <div className="relative -mt-16 mb-6 inline-block">
            <div className="w-28 h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Employee Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>
          </div>

          {/* Name & Code */}
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">
              {employee.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-gray w-full">
              <span className="font-mono bg-bg-tint border border-border-light px-2.5 py-0.5 rounded text-xs text-primary-dark">
                Code: {employee.employee_code || "N/A"}
              </span>
              <span>&bull;</span>
              <span className="capitalize">{employee.role.replace("_", " ")}</span>
              
              <button
                onClick={handleStartMessage}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm text-xs font-bold transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Send Message
              </button>
            </div>
          </div>

          {/* Detail Attributes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-border-light/60">
            
            {/* Left Column info */}
            <div className="space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <span className="text-sm font-bold text-dark-text">{employee.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Contact</span>
                  <span className="text-sm font-bold text-dark-text">{employee.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                  <span className="text-sm font-bold text-dark-text">{employee.department || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</span>
                  <span className="text-sm font-bold text-dark-text">{employee.designation || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Right Column info */}
            <div className="space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Contact</span>
                  <span className="text-sm font-bold text-dark-text">{employee.emergency_contact || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joined Date</span>
                  <span className="text-sm font-bold text-dark-text">
                    {employee.joined_at ? new Date(employee.joined_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</span>
                  <span className="text-sm font-bold text-dark-text">{employee.created_by_email || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Profile Update</span>
                  <span className="text-sm font-bold text-dark-text font-mono">
                    {new Date(employee.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Address Spanning Full Width */}
            <div className="md:col-span-2 pt-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-bg-tint border border-border-light/60 flex items-center justify-center text-primary-dark shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Address</span>
                <p className="text-sm font-semibold text-dark-text mt-0.5 leading-relaxed">
                  {employee.address || "No address details registered."}
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* METRICS PANEL FOR COURIERS */}
      {metrics && (
        <div className="bg-white rounded-[2rem] border border-border-light shadow-xl p-8 hover:border-primary/10 transition-all duration-300 space-y-6">
          <div>
            <h3 className="text-lg font-black text-dark-text uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-dark" />
              Delivery Partner Dispatch Metrics
            </h3>
            <p className="text-xs text-muted-gray mt-1">Real-time driver productivity index and delivery success rates.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Availability Status</span>
              <span className={`block mt-1.5 text-sm font-bold uppercase ${
                metrics.availability === "Available" ? "text-primary-dark" : "text-amber-600"
              }`}>
                {metrics.availability}
              </span>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Shipments</span>
              <span className="block mt-1.5 text-lg font-extrabold text-dark-text">{metrics.active_orders}</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Completed Today</span>
              <span className="block mt-1.5 text-lg font-extrabold text-[#0F6E56]">{metrics.completed_orders}</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Success Rating</span>
              <span className="block mt-1.5 text-lg font-extrabold text-indigo-700">{metrics.success_rate}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Assignments</span>
              <span className="block mt-1.5 text-base font-bold text-slate-700">{metrics.assigned_orders}</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Failed Runs</span>
              <span className="block mt-1.5 text-base font-bold text-rose-600">{metrics.failed_orders}</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Delivery Time</span>
              <span className="block mt-1.5 text-base font-bold text-slate-700">
                {metrics.avg_delivery_seconds > 0 
                  ? `${Math.round(metrics.avg_delivery_seconds / 3600)} Hours`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
