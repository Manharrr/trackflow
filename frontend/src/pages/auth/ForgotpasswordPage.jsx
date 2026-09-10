import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { ShieldCheck, Phone, ArrowLeft, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axiosInstance.post('/auth/forgot-password/', { phone })
      
      toast.success('Password reset code sent successfully via SMS.')
      
      navigate('/verify-reset-otp', {
        state: { phone }
      })
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'No account found with this phone number.'
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
          <KeyRound className="h-7 w-7" />
        </div>

        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-2">
          Forgot Password
        </h1>
        <p className="text-muted-gray text-sm mb-8 leading-relaxed">
          Enter your phone number to receive a 6-digit verification code.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
              Registered Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Phone className="h-5 w-5" />
              </div>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                required
                aria-label="Phone Number"
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
                <span>Sending OTP...</span>
              </>
            ) : (
              'Send OTP Code'
            )}
          </button>

          <div className="flex justify-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-slate-400 hover:text-dark-text transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}