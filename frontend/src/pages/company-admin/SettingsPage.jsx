import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { Building2, MapPin, FileText, Globe, DollarSign, Clock, Briefcase, Camera, Check } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const companyId = user?.tenant?.id

  const getInitialData = () => {
    let parsedDesc = {}
    try {
      parsedDesc = JSON.parse(user?.tenant?.description || '{}')
    } catch {
      parsedDesc = { description: user?.tenant?.description || '' }
    }

    return {
      name: user?.tenant?.name || '',
      address: user?.tenant?.address || '',
      description_text: parsedDesc.description || '',
      business_type: parsedDesc.business_type || 'Logistics',
      timezone: parsedDesc.timezone || 'UTC',
      default_currency: parsedDesc.default_currency || 'USD',
      business_hours: parsedDesc.business_hours || '9:00 AM - 6:00 PM',
    }
  }

  const [formData, setFormData] = useState(getInitialData())
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.tenant) {
      setFormData(getInitialData())
      if (user.tenant.logo) {
        const API_HOST = window.location.hostname
        setLogoPreview(`http://${API_HOST}:8000${user.tenant.logo}`)
      }
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyId) {
      toast.error('Workspace identifier not found.')
      return
    }

    setLoading(true)

    // Serialize additional fields into description field to respect database constraints
    const descriptionPayload = JSON.stringify({
      description: formData.description_text,
      business_type: formData.business_type,
      timezone: formData.timezone,
      default_currency: formData.default_currency,
      business_hours: formData.business_hours,
    })

    const payload = new FormData()
    payload.append('name', formData.name)
    payload.append('address', formData.address)
    payload.append('description', descriptionPayload)
    if (logoFile) {
      payload.append('logo', logoFile)
    }

    try {
      await axiosInstance.put(`/super-admin/companies/${companyId}/`, payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Company settings updated successfully!')
      
      // Force reload auth user details
      window.location.reload()
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update company settings.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 relative overflow-hidden mt-6 animate-fade-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10" />

      <div className="flex items-center gap-2 mb-6">
        <div className="bg-teal-600 p-2 rounded-xl text-white shadow-md shadow-teal-600/10">
          <Building2 className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-slate-900">Workspace Management</span>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Company Settings
      </h1>
      <p className="text-slate-500 mb-8 text-sm">
        Modify your enterprise logistics workspace profile and operating configuration.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-150">
          <div className="relative w-20 h-20 rounded-full bg-slate-200 border-2 border-slate-350 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Company logo preview" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-slate-400" />
            )}
            <label className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <span className="block text-sm font-semibold text-slate-700 mb-1">Company logo</span>
            <p className="text-slate-400 text-xs mb-3">Upload a square workspace logo.</p>
            <label className="bg-white border border-slate-255 text-slate-700 hover:bg-slate-50 active:scale-[0.98] py-1.5 px-3 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer inline-block">
              Choose Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Company Name
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Building2 className="h-5 w-5" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Business Type
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none appearance-none"
              >
                <option value="Logistics">Logistics & Supply Chain</option>
                <option value="E-commerce">E-commerce Delivery</option>
                <option value="Warehousing">Warehousing & Distribution</option>
                <option value="Retail">Retail Transport</option>
                <option value="Manufacturing">Manufacturing Freight</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Company Address
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 pt-4 flex items-start pointer-events-none text-slate-400">
              <MapPin className="h-5 w-5" />
            </div>
            <textarea
              name="address"
              placeholder="Office address..."
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Company Description
          </label>
          <div className="relative rounded-2xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-4 pt-4 flex items-start pointer-events-none text-slate-400">
              <FileText className="h-5 w-5" />
            </div>
            <textarea
              name="description_text"
              placeholder="Company services description..."
              value={formData.description_text}
              onChange={handleChange}
              rows={3}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none"
              required
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Timezone
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Globe className="h-5 w-5" />
              </div>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none appearance-none text-sm"
              >
                <option value="UTC">UTC (GMT)</option>
                <option value="Asia/Kolkata">IST (Kolkata)</option>
                <option value="America/New_York">EST (New York)</option>
                <option value="Europe/London">GMT (London)</option>
                <option value="Asia/Singapore">SGT (Singapore)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Default Currency
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <select
                name="default_currency"
                value={formData.default_currency}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none appearance-none text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Business Hours
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Clock className="h-5 w-5" />
              </div>
              <input
                type="text"
                name="business_hours"
                value={formData.business_hours}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all outline-none text-sm"
                required
              />
            </div>
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
              <span>Saving Settings...</span>
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
