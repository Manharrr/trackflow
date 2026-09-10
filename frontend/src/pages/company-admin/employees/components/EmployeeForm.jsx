import { useState } from "react";
import { validateEmployeeForm } from "../validations/employeeValidation";

export default function EmployeeForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "employee",
    department: "",
    designation: "",
    manager: "",
    joined_at: "",
    address: "",
    emergency_contact: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for field when user typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateEmployeeForm(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Map fields cleanly before submitting
    const payload = { ...formData };
    
    // Convert empty manager string to null
    if (!payload.manager || payload.manager.trim() === "") {
      payload.manager = null;
    }
    // Convert empty joined_at to null
    if (!payload.joined_at || payload.joined_at.trim() === "") {
      payload.joined_at = null;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. PERSONAL INFORMATION */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#0F6E56] rounded-full inline-block"></span>
          Personal Information
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="e.g. your name"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.full_name ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.full_name && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. yourname@trackflow.ai"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +1234567890"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.phone ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.phone && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. EMPLOYMENT INFORMATION */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#0F6E56] rounded-full inline-block"></span>
          Employment Information
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all"
            >
              <option value="employee">Employee</option>
              <option value="operations_manager">Operations Manager</option>
            </select>
            {errors.role && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.role}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Department *
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Operations"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.department ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.department && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.department}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Designation *
            </label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g. Logistics Coordinator"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.designation ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.designation && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.designation}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Joined Date
            </label>
            <input
              type="date"
              name="joined_at"
              value={formData.joined_at}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Manager UUID (Optional)
            </label>
            <input
              type="text"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              placeholder="Copy-paste manager's UUID from their profile"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. ADDITIONAL INFORMATION */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#0F6E56] rounded-full inline-block"></span>
          Additional Information
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. 123 Logistics Way, Sector 4"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F6E56] focus:border-[#0F6E56] bg-slate-50/50 transition-all resize-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              name="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleChange}
              placeholder="e.g. +1234567890"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.emergency_contact ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.emergency_contact && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.emergency_contact}</p>
            )}
          </div>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex items-center justify-end gap-4 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5946] text-white font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
          ) : (
            "Create Employee"
          )}
        </button>
      </div>
    </form>
  );
}
