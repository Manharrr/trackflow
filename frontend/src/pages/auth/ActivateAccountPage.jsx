import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, CheckCircle } from "lucide-react";
import { verifyActivationToken, activateAccount } from "../company-admin/employees/services/employeeService";
import toast from "react-hot-toast";

export default function ActivateAccountPage() {
  const { token } = useParams();
  const [tokenValid, setTokenValid] = useState(null); // null = loading, true = valid, false = invalid
  const [checkingToken, setCheckingToken] = useState(true);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [isActivating, setIsActivating] = useState(false);
  const [activatedSuccessfully, setActivatedSuccessfully] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const data = await verifyActivationToken(token);
        setEmail(data.email || "");
        setTokenValid(true);
      } catch (err) {
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsActivating(true);
    try {
      await activateAccount(token, formData.password, formData.confirm_password);
      toast.success("Account activated successfully!");
      setActivatedSuccessfully(true);
    } catch (err) {
      toast.error(err.response?.data?.token?.[0] || "Failed to activate account.");
    } finally {
      setIsActivating(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-[#F7F7F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#0F6E56]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-500 font-semibold text-sm">Verifying activation token...</span>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-[#F7F7F3] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-slate-500 text-sm mb-6">
            This account activation link is invalid, has already been used, or expired after 48 hours. Please contact your company administrator to issue a new activation token.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-[#0F6E56] hover:bg-[#0c5946] text-white font-semibold rounded-xl transition-colors text-sm cursor-pointer"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  if (activatedSuccessfully) {
    return (
      <div className="min-h-screen bg-[#F7F7F3] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0F6E56] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Activated!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your TrackFlow AI employee account for <strong className="text-slate-800">{email}</strong> has been successfully configured. You can now log in using your email and the password you just set.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-[#0F6E56] hover:bg-[#0c5946] text-white font-semibold rounded-xl transition-colors text-sm cursor-pointer"
          >
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F3] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-xl border border-slate-100 p-8">
        
        {/* LOGO & TITLE */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">TrackFlow AI</h2>
            <p className="text-xs text-slate-500">Workspace Activation</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold leading-tight text-slate-900">
          Activate Account
        </h1>
        <p className="mt-2.5 text-slate-500 text-sm">
          Set a secure password for your profile associated with <strong className="text-slate-800">{email}</strong>.
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className={`w-full pl-4 pr-11 py-3 rounded-xl border ${
                  errors.password ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Re-enter your new password"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.confirm_password ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500" : "border-slate-200 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
              } focus:outline-none focus:ring-2 bg-slate-50/50 transition-all`}
            />
            {errors.confirm_password && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.confirm_password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isActivating}
            className="w-full py-3.5 bg-[#0F6E56] hover:bg-[#0c5946] text-white font-semibold rounded-xl shadow-sm transition-all text-sm flex items-center justify-center cursor-pointer"
          >
            {isActivating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Activating...
              </span>
            ) : (
              "Activate and Set Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
