import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  createOrder, 
  getOrderDetails, 
  updateOrder, 
  getAssignablePartners 
} from "../../services/ordersService";
import { Package, ChevronRight, Save, UserPlus, Info } from "lucide-react";
import toast from "react-hot-toast";
import SearchableCourierSelector from "../../components/ui/SearchableCourierSelector";

export default function OrderCreatePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!orderId;

  const [isLoading, setIsLoading] = useState(false);
  const [assignableDrivers, setAssignableDrivers] = useState([]);
  const [initialDriverName, setInitialDriverName] = useState("");
  
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    pickup_address: "",
    delivery_address: "",
    priority: "Medium",
    expected_delivery_date: "",
    internal_notes: "",
    assigned_employee: "",
  });

  const [errors, setErrors] = useState({});

  // Fetch assignable drivers for assignment dropdown on mount
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const list = await getAssignablePartners();
        setAssignableDrivers(list || []);
      } catch (err) {
        // Silently log or warning
      }
    };
    loadDrivers();
  }, []);

  // Fetch existing details if editing
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const details = await getOrderDetails(orderId);
        let formattedDate = "";
        if (details.expected_delivery_date) {
          const dateObj = new Date(details.expected_delivery_date);
          formattedDate = dateObj.toISOString().slice(0, 16);
        }
        setFormData({
          customer_name: details.customer_name || "",
          customer_phone: details.customer_phone || "",
          customer_email: details.customer_email || "",
          pickup_address: details.pickup_address || "",
          delivery_address: details.delivery_address || "",
          priority: details.priority || "Medium",
          expected_delivery_date: formattedDate,
          internal_notes: details.internal_notes || "",
          assigned_employee: details.assigned_employee || "",
        });
        setInitialDriverName(details.assigned_employee_name || "");
      } catch (err) {
        toast.error("Failed to load pre-existing order details.");
        navigate("/dashboard/orders");
      }
    };
    if (isEdit) {
      fetchOrder();
    }
  }, [orderId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const tempErrors = {};
    if (!formData.customer_name.trim()) tempErrors.customer_name = "Customer name is required.";
    if (!formData.customer_phone.trim()) tempErrors.customer_phone = "Customer phone contact is required.";
    if (!formData.pickup_address.trim()) tempErrors.pickup_address = "Pickup address is required.";
    if (!formData.delivery_address.trim()) tempErrors.delivery_address = "Delivery destination is required.";
    
    if (!formData.expected_delivery_date) {
      tempErrors.expected_delivery_date = "Expected delivery date is required.";
    } else {
      const expDate = new Date(formData.expected_delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        tempErrors.expected_delivery_date = "Expected delivery date cannot be before today.";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const payload = { ...formData };
    if (!payload.assigned_employee) {
      payload.assigned_employee = null;
    }

    try {
      if (isEdit) {
        await updateOrder(orderId, payload);
        toast.success("Order updated successfully.");
        navigate(`/dashboard/orders/${orderId}`);
      } else {
        const res = await createOrder(payload);
        toast.success("Order created successfully.");
        navigate(`/dashboard/orders/${res.data.id}`);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.customer_phone?.[0] ||
        err.response?.data?.expected_delivery_date?.[0] ||
        err.response?.data?.assigned_employee?.[0] ||
        err.response?.data?.detail ||
        "Failed to save dispatch profile."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left animate-fade-in pb-16">
      
      {/* BREADCRUMB & HEADER */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Logistics Command</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#0F6E56]">Registry</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{isEdit ? "Edit Details" : "Add Order"}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Package className="w-8 h-8 text-[#0F6E56]" />
              {isEdit ? "Edit Dispatch Details" : "Create New Dispatch Order"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Specify customer destinations, SLA timelines, priorities, and custom internal operational notes.
            </p>
          </div>
        </div>
      </div>

      {/* FORM WRAPPER */}
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. RECIPIENT INFORMATION */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#0F6E56] rounded-full inline-block"></span>
            Customer Information
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Recipient Full Name *
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="e.g. Rahul Kumar"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.customer_name ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all text-sm`}
              />
              {errors.customer_name && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.customer_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Recipient Phone Contact *
              </label>
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                placeholder="e.g. +919876543210"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.customer_phone ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all text-sm`}
              />
              {errors.customer_phone && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.customer_phone}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Recipient Email Address
              </label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                placeholder="e.g. customer@trackflow.test"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. LOGISTICS DESTINATIONS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#0F6E56] rounded-full inline-block"></span>
            SLA Destinations & Priority
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Pickup Source Address *
              </label>
              <textarea
                name="pickup_address"
                value={formData.pickup_address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter pickup hub address..."
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.pickup_address ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all resize-none text-sm`}
              />
              {errors.pickup_address && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.pickup_address}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Delivery Destination Address *
              </label>
              <textarea
                name="delivery_address"
                value={formData.delivery_address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter drop-off destination address..."
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.delivery_address ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all resize-none text-sm`}
              />
              {errors.delivery_address && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.delivery_address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Priority Rank
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all text-sm cursor-pointer"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Expected Delivery Deadline Date
              </label>
              <input
                type="datetime-local"
                name="expected_delivery_date"
                value={formData.expected_delivery_date}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.expected_delivery_date ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all text-sm`}
              />
              {errors.expected_delivery_date && (
                <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.expected_delivery_date}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Internal Operations Notes (Hidden from Delivery partners)
              </label>
              <textarea
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. VIP Customer, Handle Carefully, evening delivery only..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* 3. DELIVERY PARTNER ASSIGNMENT */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0F6E56]" />
            Assign Delivery Partner (Optional)
          </h3>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Executive Partner
            </label>
            <SearchableCourierSelector
              value={formData.assigned_employee}
              onChange={(val) => setFormData((prev) => ({ ...prev, assigned_employee: val }))}
              initialCourierName={initialDriverName}
            />
          </div>
        </div>

        {/* 4. DISPATCH SUMMARY REVIEW PANEL */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 lg:p-8 space-y-4">
          <h4 className="text-xs font-black text-[#0F6E56] uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4" /> Dispatch Order Summary & Review
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Tracking ID</span>
              <span className="font-mono font-bold text-slate-600 mt-1 block">
                TRKXXXXXX (Auto Generated)
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Recipient Customer</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {formData.customer_name || "Not Specified"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Priority Status</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {formData.priority} Priority
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Expected SLA Deadline</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {formData.expected_delivery_date ? new Date(formData.expected_delivery_date).toLocaleString() : "Not Specified"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Assigned Executive</span>
              <span className="font-bold text-slate-900 mt-1 block text-primary-dark">
                {formData.assigned_employee 
                  ? assignableDrivers.find(d => d.id === formData.assigned_employee)?.full_name || "Assigned Driver" 
                  : "Unassigned (Pending Queue)"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Initial Dispatch Status</span>
              <span className="font-bold text-slate-900 mt-1 block font-bold">
                {formData.assigned_employee ? "Assigned" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => navigate(orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders")}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5946] text-white font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? "Update Order Details" : "Create Dispatch Order"}
          </button>
        </div>

      </form>
    </div>
  );
}
