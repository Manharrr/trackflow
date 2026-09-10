import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff, ShieldAlert, Check } from 'lucide-react'

export default function Changepassword() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match.')
      return
    }

    if (formData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      await axiosInstance.post('/auth/change-password/', {
        old_password: formData.old_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      })

      toast.success('Password changed successfully!')
      navigate('/profile')
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to change password. Please verify your old password.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 relative overflow-hidden mt-6 animate-fade-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10" />

      <div className="flex items-center gap-2 mb-6">
        <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md shadow-teal-600/10">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-slate-900">Security</span>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Change Password
      </h1>
      <p className="text-slate-500 mb-8 text-sm">
        Update your password to keep your enterprise workspace profile secure.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Old Password
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showOldPassword ? 'text' : 'password'}
              name="old_password"
              placeholder="••••••••"
              value={formData.old_password}
              onChange={handleChange}
              className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-200 outline-none text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            New Password
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="new_password"
              placeholder="••••••••"
              value={formData.new_password}
              onChange={handleChange}
              className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-200 outline-none text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm_password"
              placeholder="••••••••"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all duration-200 outline-none text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white py-4 px-6 rounded-2xl font-semibold shadow-lg shadow-teal-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span>Update Password</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
