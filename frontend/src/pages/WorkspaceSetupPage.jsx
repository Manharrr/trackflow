import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axiosInstance from '../api/axios'
import toast from 'react-hot-toast'
import { ShieldCheck, Building2, Globe, Phone, UserCheck } from 'lucide-react'

export default function WorkspaceSetupPage() {
    const navigate = useNavigate()
    const location = useLocation()

    // Retrieve email passed from Google SSO setup flow redirection
    const email = location.state?.email || ''

    const [formData, setFormData] = useState({
        company_name: '',
        subdomain: '',
        phone: '',
    })

    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                email,
                company_name: formData.company_name,
                workspace_code: formData.subdomain,
                phone: formData.phone,
            }

            await axiosInstance.post('/auth/complete-setup/', payload)

            toast.success('Company setup submitted! Verification code sent via SMS.')

            navigate('/verify-phone', {
                state: {
                    phone: formData.phone,
                    email,
                },
            })
        } catch (err) {
            const errData = err.response?.data
            if (errData) {
                const firstErrorKey = Object.keys(errData)[0]
                const firstErrorVal = errData[firstErrorKey]
                const detailMsg = Array.isArray(firstErrorVal) ? firstErrorVal[0] : firstErrorVal
                toast.error(`${firstErrorKey}: ${detailMsg}`)
            } else {
                toast.error('Setup failed. Please review your company configuration.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="bg-white rounded-[2rem] p-8 sm:p-12 w-full max-w-lg shadow-xl border border-border-light relative overflow-hidden text-left hover:border-primary/10 transition-all duration-300">
                {/* Visual decorations */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-40 -mr-10 -mt-10" />

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/25">
                        T
                    </div>
                    <span className="text-base font-bold text-dark-text">TrackFlow Setup</span>
                </div>

                <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-2">
                    Complete Workspace Configuration
                </h1>
                <p className="text-muted-gray mb-8 text-sm leading-relaxed">
                    Configure the remaining company details for email profile <strong className="text-dark-text font-bold font-mono">{email}</strong>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                            Company Name
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                name="company_name"
                                placeholder="Example Logistics"
                                value={formData.company_name}
                                onChange={handleChange}
                                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                                required
                                aria-label="Company Name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                            Company Subdomain / Workspace Code
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <Globe className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                name="subdomain"
                                placeholder="example-logistics"
                                value={formData.subdomain}
                                onChange={handleChange}
                                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                                required
                                aria-label="Company Subdomain Workspace Code"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                            Company Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <Phone className="h-5 w-5" />
                            </div>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="+91 9876543210"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                                required
                                aria-label="Company Phone Number"
                            />
                        </div>
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
                                <span>Submitting...</span>
                            </>
                        ) : (
                            'Submit For Approval'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}