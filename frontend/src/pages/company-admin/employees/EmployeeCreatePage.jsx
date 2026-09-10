import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { createEmployee } from "./services/employeeService";
import EmployeeForm from "./components/EmployeeForm";
import toast from "react-hot-toast";

export default function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (employeeData) => {
    setIsLoading(true);
    try {
      await createEmployee(employeeData);
      toast.success("Employee onboarding initiated successfully! Activation email has been dispatched.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        err.response?.data?.email?.[0] ||
        err.response?.data?.phone?.[0] ||
        err.response?.data?.detail ||
        "Failed to create employee profile."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* BREADCRUMB & HEADER */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Workspace</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#0F6E56]">Employees</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Add New</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-[#0F6E56]" />
              Onboard New Employee
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Create employee profile immediately. An activation email will be sent to the address provided.
            </p>
          </div>
        </div>
      </div>

      {/* FORM CARD */}
      <EmployeeForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/dashboard")}
        isLoading={isLoading}
      />
    </div>
  );
}
