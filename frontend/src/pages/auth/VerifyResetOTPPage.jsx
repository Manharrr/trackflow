import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { KeyRound, ArrowLeft } from 'lucide-react'

export default function VerifyResetOTPPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const phone = location.state?.phone || ''

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axiosInstance.post('/auth/verify-reset-otp/', {
        phone,
        otp,
      })

      toast.success('Verification code verified!')

      // Navigates to reset-password passing verified OTP code
      navigate('/reset-password', {
        state: {
          phone,
          otp,
        },
      })
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Invalid OTP code. Please check and try again.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-[2rem] p-8 sm:p-12 w-full max-w-md shadow-xl border border-border-light relative overflow-hidden text-center hover:border-primary/10 transition-all duration-300">
        {/* Decoration */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-40 -ml-5 -mt-5" />

        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary-dark shadow-sm">
          <KeyRound className="h-7 w-7" />
        </div>

        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-2">
          Verify OTP
        </h1>
        <p className="text-muted-gray text-sm mb-1 leading-relaxed">
          Enter the 6-digit password reset OTP sent to:
        </p>
        <p className="font-bold text-dark-text text-base mb-8">
          {phone}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full text-center text-2xl font-bold tracking-[8px] bg-white border border-border-light rounded-xl p-4 text-dark-text placeholder-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              required
              aria-label="Verification OTP"
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
              'Verify OTP'
            )}
          </button>

          <div className="flex justify-center pt-2">
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-slate-400 hover:text-dark-text transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Change Phone Number
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}