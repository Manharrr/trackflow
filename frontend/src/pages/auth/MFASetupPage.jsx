import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { ShieldCheck, ArrowLeft, RefreshCw, Check } from 'lucide-react'

export default function MFASetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')

  const fetchMfaDetails = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/auth/mfa/setup/')
      setQrCode(res.data.qr_code)
      setSecret(res.data.secret)
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to retrieve MFA details. Please ensure you are authorized.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMfaDetails()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (verifying) return
    setVerifying(true)

    try {
      await axiosInstance.post('/auth/mfa/verify/', { code })
      toast.success('MFA configuration verified and enabled successfully!')
      
      // Navigate to setup dashboard or profile page
      navigate('/profile')
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Verification code failed. Please verify the 6-digit authenticator code.'
      toast.error(errMsg)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 relative overflow-hidden mt-6 animate-fade-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10" />

      <div className="flex items-center gap-2 mb-6">
        <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md shadow-teal-600/10">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-slate-900">Security</span>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Configure Multi-Factor Auth (MFA)
      </h1>
      <p className="text-slate-500 mb-8 text-sm">
        Use Google Authenticator or Microsoft Authenticator to scan the QR code below and complete setup.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-10 h-10 border-4 border-teal-650 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Generating MFA Secret Key...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* QR Code and Secret display */}
          <div className="flex flex-col items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            {qrCode ? (
              <img src={qrCode} alt="TOTP Provisioning QR Code" className="w-48 h-48 rounded-xl shadow-md border border-slate-200 bg-white p-2" />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-slate-200 border border-slate-350 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
              </div>
            )}
            <div className="text-center w-full">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Authenticator key</span>
              <code className="bg-slate-200/60 text-slate-800 px-3 py-1.5 rounded-lg text-sm font-bold font-mono tracking-wider select-all border border-slate-250 inline-block max-w-full truncate">
                {secret}
              </code>
              <p className="text-slate-400 text-xxs mt-2">Enter this key manually if you cannot scan the QR code.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-center text-2xl font-bold tracking-[8px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 placeholder-slate-300 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                required
              />
            </div>

            <div className="flex gap-4">
              <Link
                to="/profile"
                className="flex-1 bg-white border border-slate-250 hover:bg-slate-50 active:scale-[0.98] text-slate-700 py-4 px-6 rounded-2xl font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span>Cancel Setup</span>
              </Link>
              <button
                type="submit"
                disabled={verifying}
                className="flex-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white py-4 px-6 rounded-2xl font-semibold shadow-lg shadow-teal-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {verifying ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Verify & Enable</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
