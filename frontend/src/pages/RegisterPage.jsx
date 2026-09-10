import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import axiosInstance from '../api/axios'
import toast from 'react-hot-toast'
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Lock,
  CheckCircle2,
  Sparkles,
  FolderLock,
  Bot,
} from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    admin_name: '',
    company_name: '',
    email: '',
    phone: '',
    subdomain: '',
    password: '',
    confirm_password: '',
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

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match.')
      return
    }

    try {
      setLoading(true)

      const payload = {
        admin_name: formData.admin_name,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        workspace_code: formData.subdomain,
        password: formData.password,
        confirm_password: formData.confirm_password,
      }

      await axiosInstance.post('/auth/register/', payload)

      toast.success('Registration submitted! Verification code dispatched.')

      navigate('/verify-phone', {
        state: {
          phone: formData.phone,
          email: formData.email,
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
        toast.error('Registration failed. Please review your workspace details.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-6xl bg-white border border-border-light rounded-[2rem] shadow-xl overflow-hidden grid lg:grid-cols-12 min-h-[700px] hover:border-primary/10 transition-all duration-300">
        
        {/* Left Form Column */}
        <div className="lg:col-span-7 px-8 sm:px-16 py-12 sm:py-16 flex flex-col justify-center text-left">
          <div className="max-w-xl w-full mx-auto">
            
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

            <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-1.5">
              Launch Your Workspace
            </h1>
            <p className="text-muted-gray text-sm leading-relaxed mb-8">
              Get started by configuring your isolated multi-tenant company environment.
            </p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Company Admin Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    name="admin_name"
                    placeholder="your name"
                    value={formData.admin_name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    required
                    aria-label="Admin Name"
                  />
                </div>
              </div>

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
                    placeholder="Acme Logistics"
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
                  Company Subdomain
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    name="subdomain"
                    placeholder="acme-logistics"
                    value={formData.subdomain}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    required
                    aria-label="Workspace Code Subdomain"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="admin@acme.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    required
                    aria-label="Admin Email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Phone Number
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
                    aria-label="Phone Number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    required
                    aria-label="Password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    required
                    aria-label="Confirm Password"
                  />
                </div>
              </div>

              <div className="md:col-span-2 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/15 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Workspace...</span>
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>

            <p className="text-center mt-8 text-sm text-muted-gray">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-primary hover:text-primary-dark hover:underline transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Right Feature Panel – Matches the provided image model */}
        <div className="hidden lg:col-span-5 lg:flex bg-[#061a15] relative overflow-hidden flex-col justify-between p-12 text-left border-l border-primary/10">
          {/* Background Decorations */}
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary-dark/10 blur-3xl"></div>

          {/* Top Tag */}
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-primary bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              What you get with TrackFlow
            </span>
          </div>

          {/* Feature List */}
          <div className="my-auto py-8 relative z-10 space-y-8">
            <div className="flex gap-4">
              <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-white">Your own subdomain</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Launch instantly with your own private client workspace.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <FolderLock className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-white">Private client portals</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Every client gets secure requests, files and approvals.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Bot className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-white">AI workflow automation</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Automate onboarding, approvals and communication.
                </p>
              </div>
            </div>
          </div>

          {/* Subdomain Preview (like in the image) */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-white font-mono text-sm tracking-wider">
              yourcompany.trackflow.ai
            </span>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-xs text-slate-500 mt-4">
            &copy; {new Date().getFullYear()} TrackFlow AI. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}