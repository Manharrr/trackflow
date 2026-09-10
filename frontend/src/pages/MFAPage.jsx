import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { ShieldCheck, Fingerprint, ArrowLeft } from 'lucide-react'

export default function MFAPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { completeMfaLogin } = useAuth()

    const email = location.state?.email || ''
    const workspace_code = location.state?.workspace_code || ''

    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading) return
        setLoading(true)

        try {
            const res = await axiosInstance.post('/auth/mfa/login/', {
                email,
                code,
                workspace_code,
            })

            const token = res.data.access
            const workspaceUrl = res.data.tenant?.workspace_url
            const refreshToken = res.data.refresh

            const me = await completeMfaLogin(token, workspaceUrl, refreshToken)

            if (me?.redirectUrl) {
                window.location.href = me.redirectUrl
                return
            }

            toast.success("MFA verification successful!")

            const role = me?.role || me?.user?.role

            if (role === "super_admin") {
                navigate("/super-admin")
                return
            }

            if (workspaceUrl) {
                window.location.href = `${workspaceUrl}/dashboard`
                return
            }

            if (role === "company_admin") {
                navigate("/dashboard")
            } else if (role === "operations_manager") {
                navigate("/operations")
            } else {
                navigate("/employee")
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Invalid MFA code. Please verify your Google Authenticator app code.'
            toast.error(errMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-[2rem] p-8 sm:p-12 w-full max-w-md shadow-xl border border-border-light relative overflow-hidden text-center hover:border-primary/10 transition-all duration-300">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-40 -mr-5 -mt-5" />

                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary-dark shadow-sm">
                    <Fingerprint className="h-7 w-7" />
                </div>

                <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-2">
                    MFA Verification
                </h1>
                <p className="text-muted-gray text-sm mb-1 leading-relaxed">
                    Enter the 6-digit verification code from Microsoft / Google Authenticator for profile:
                </p>
                <p className="font-bold text-dark-text text-sm mb-8 truncate font-mono">
                    {email}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full text-center text-2xl font-bold tracking-[8px] bg-white border border-border-light rounded-xl p-4 text-dark-text placeholder-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            required
                            aria-label="Authenticator Code"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 active:scale-[0.98] text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/15 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Verifying code...</span>
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </button>

                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-primary hover:text-primary-dark hover:underline transition-colors mt-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </Link>
                </form>
            </div>
        </div>
    )
}