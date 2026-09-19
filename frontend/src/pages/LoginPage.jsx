import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth, getTenantWorkspaceOrigin } from "../contexts/AuthContext";
import GoogleLoginButton from "../components/auth/GoogleLoginButton";
import toast from "react-hot-toast";

import {
    Phone,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        phone: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setLoading(true);

        try {
            const data = await login(
                formData.phone,
                formData.password
                
            );

            handleLoginResponse(data);
        } catch (err) {
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.detail ||
                "Authentication failed."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceSelect = async (workspaceCode) => {
        setLoading(true);

        try {
            const data = await login(
                formData.phone,
                formData.password,
                workspaceCode
            );

            handleLoginResponse(
                data,
                workspaceCode
            );
        } catch (err) {
            toast.error(
                err.response?.data?.error ||
                "Workspace authentication failed."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLoginResponse = (
        data,
        workspaceCode
    ) => {
        if (data.multiple_workspaces) {
            setWorkspaces(data.workspaces);
            toast.success(
                "Select your workspace."
            );
            return;
        }

        if (data.phone_verify) {
            navigate("/verify-phone", {
                state: {
                    phone: formData.phone,
                    email: data.email,
                },
            });
            return;
        }

        if (data.pending) {
            navigate("/pending-approval");
            return;
        }

        if (data.mfa_required) {
            navigate("/mfa", {
                state: {
                    email: data.email,
                    workspace_code: workspaceCode,
                    tenant: data.tenant,
                },
            });
            return;
        }

        toast.success("Welcome back!");

        if (data.redirectUrl) {
            if (data.redirectUrl.startsWith("http://") || data.redirectUrl.startsWith("https://")) {
                window.location.replace(data.redirectUrl);
            } else {
                navigate(data.redirectUrl, { replace: true });
            }
            return;
        }

        const targetOrigin = getTenantWorkspaceOrigin(data.tenant || data.user?.tenant);
        if (targetOrigin && window.location.origin !== targetOrigin) {
            const destUrl = `${targetOrigin}/dashboard`;
            window.location.replace(destUrl);
            return;
        }

        const role = data.user?.role || data.role;

        if (role === "super_admin") {
            navigate("/super-admin", { replace: true });
        } else if (role === "company_admin") {
            if (data.subscription && data.subscription.subscription_status !== "active") {
                navigate("/payment", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        } else if (role === "operations_manager") {
            navigate("/operations", { replace: true });
        } else {
            navigate("/employee", { replace: true });
        }

        // const role =
        //     data.role || data.user?.role;

        // if (role === "super_admin") {
        //     navigate("/super-admin");
        // } else if (role === "company_admin") {
        //     navigate("/dashboard");
        // } else if (
        //     role === "operations_manager"
        // ) {
        //     navigate("/operations");
        // } else {
        //     navigate("/employee");
        // }
    };

    return (
        <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8">

            <div className="w-full max-w-6xl bg-white border border-border-light rounded-[2rem] shadow-xl overflow-hidden grid lg:grid-cols-12 min-h-[600px] hover:border-primary/10 transition-all duration-300">

                {/* LEFT FORM PANEL */}

                <div className="lg:col-span-7 px-8 sm:px-16 py-12 sm:py-16 flex flex-col justify-center text-left">

                    <div className="flex items-center gap-3 mb-8 group">

                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/25">

                            T

                        </div>

                        <div>

                            <h2 className="font-extrabold text-lg text-dark-text tracking-tight leading-none">
                                TrackFlow<span className="text-primary font-black">.ai</span>
                            </h2>

                            <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase mt-1 block">
                                Logistics Platform
                            </span>

                        </div>

                    </div>

                    {workspaces.length === 0 ? (
                        <>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-dark-text tracking-tight">

                                Welcome back

                            </h1>

                            <p className="mt-2 text-muted-gray text-sm sm:text-base leading-relaxed">

                                Sign in to access your logistics workspace and manage operations securely.

                            </p>

                            <form
                                onSubmit={handleSubmit}
                                className="mt-8 space-y-5"
                            >

                                {/* PHONE */}

                                <div>

                                    <label className="text-xs font-bold text-dark-text uppercase tracking-wider">

                                        Phone Number

                                    </label>

                                    <div className="mt-2 relative">

                                        <Phone
                                            className="absolute left-4 top-3.5 text-slate-400"
                                            size={18}
                                        />

                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+91 9876543210"
                                            required
                                            className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                                        />

                                    </div>

                                </div>

                                {/* PASSWORD */}

                                <div>

                                    <div className="flex justify-between items-center mb-2">

                                        <label className="text-xs font-bold text-dark-text uppercase tracking-wider">

                                            Password

                                        </label>

                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-primary font-bold hover:text-primary-dark hover:underline transition-colors"
                                        >

                                            Forgot password?

                                        </Link>

                                    </div>

                                    <div className="relative">

                                        <Lock
                                            className="absolute left-4 top-3.5 text-slate-400"
                                            size={18}
                                        />

                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter password"
                                            className="w-full pl-11 pr-11 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword
                                                )
                                            }
                                            className="absolute right-4 top-3.5 text-slate-400 hover:text-dark-text transition-colors"
                                        >

                                            {showPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}

                                        </button>

                                    </div>

                                </div>

                                {/* LOGIN BUTTON */}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 transition text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/15 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm"
                                >

                                    {loading ? (
                                        "Signing In..."
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight size={16} className="mt-0.5" />
                                        </>
                                    )}

                                </button>

                                {/* OR */}

                                <div className="flex items-center gap-4 py-1">

                                    <div className="flex-1 border-t border-border-light"></div>

                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">

                                        OR

                                    </span>

                                    <div className="flex-1 border-t border-border-light"></div>

                                </div>

                                <GoogleLoginButton />

                                <p className="text-center text-muted-gray text-sm pt-2">

                                    Don't have a company account?{" "}

                                    <Link
                                        to="/register"
                                        className="font-bold text-primary hover:text-primary-dark hover:underline transition-colors"
                                    >

                                        Register Company

                                    </Link>

                                </p>

                            </form>
                        </>
                    ) : (
                        /* WORKSPACE SELECTION */
                        <div className="animate-fade-in">

                            <h2 className="text-2xl font-extrabold text-dark-text tracking-tight">
                                Select Workspace
                            </h2>

                            <p className="text-muted-gray text-sm mt-2 mb-6">
                                Your account belongs to multiple companies.
                                Select the workspace you want to enter.
                            </p>

                            <div className="space-y-3">

                                {workspaces.map((workspace) => (

                                    <button
                                        key={workspace.workspace_code}
                                        onClick={() =>
                                            handleWorkspaceSelect(
                                                workspace.workspace_code
                                            )
                                        }
                                        disabled={loading}
                                        className="w-full rounded-xl border border-border-light bg-white p-4.5 hover:border-primary hover:bg-bg-tint/40 transition-all duration-200 flex items-center justify-between group cursor-pointer"
                                    >

                                        <div className="text-left">

                                            <h3 className="font-bold text-base text-dark-text">
                                                {workspace.name}
                                            </h3>

                                            <p className="text-xs text-muted-gray mt-0.5">
                                                {workspace.workspace_code}.{window.location.hostname.includes('manhargurukkal.site') ? 'manhargurukkal.site' : 'localhost'}
                                            </p>

                                        </div>

                                        <ArrowRight
                                            className="text-primary group-hover:translate-x-1 transition-transform"
                                            size={18}
                                        />

                                    </button>

                                ))}

                            </div>

                            <button
                                onClick={() => setWorkspaces([])}
                                className="mt-8 text-sm text-slate-400 hover:text-dark-text font-bold transition-colors cursor-pointer"
                            >
                                &larr; Back to login
                            </button>

                        </div>
                    )}

                </div>

                {/* RIGHT PANEL */}

                <div className="hidden lg:col-span-5 lg:flex bg-[#061a15] relative overflow-hidden flex-col justify-between p-12 text-left border-l border-primary/10">

                    {/* Background Decoration */}

                    <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl"></div>

                    <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary-dark/10 blur-3xl"></div>

                    {/* Top Tag */}

                    <div>

                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5">

                            <ShieldCheck
                                size={14}
                                className="text-primary"
                            />

                            <span className="text-white text-xs font-bold uppercase tracking-wider">

                                Enterprise SaaS

                            </span>

                        </div>

                    </div>

                    {/* Middle Quote */}

                    <div className="my-auto py-12 relative z-10">

                        <div className="flex items-center gap-0.5 text-primary text-sm">

                            ★ ★ ★ ★ ★

                        </div>

                        <p className="text-white text-2xl font-bold leading-relaxed mt-4 font-sans tracking-tight">

                            "TrackFlow AI transformed how we manage logistics.

                            Every shipment, employee and warehouse is now managed

                            from one secure platform."

                        </p>

                        <div className="mt-8 flex items-center gap-3">

                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white text-lg font-extrabold shadow-md shadow-primary/10">

                                S

                            </div>

                            <div>

                                <h3 className="text-white font-bold text-base leading-tight">

                                    shabin mohammed

                                </h3>

                                <p className="text-primary-dark text-xs font-medium">

                                    Operations Head

                                </p>

                            </div>

                        </div>

                    </div>

                    {/* Bottom Statistics */}

                    <div className="grid grid-cols-3 gap-4 relative z-10">

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 text-left">

                            <h2 className="text-2xl font-black text-white leading-none">

                                500+

                            </h2>

                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">

                                Companies

                            </p>

                        </div>

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 text-left">

                            <h2 className="text-2xl font-black text-white leading-none">

                                3200+

                            </h2>

                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">

                                Employees

                            </p>

                        </div>

                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 text-left">

                            <h2 className="text-2xl font-black text-white leading-none">

                                98%

                            </h2>

                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">

                                Success Rate

                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}