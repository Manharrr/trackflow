import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEmployeeProfile, updateEmployeeProfile } from './employees/services/employeeService'
import axiosInstance from '../../api/axios'
import toast from 'react-hot-toast'
import { User, Mail, Phone, Camera, Check, MapPin, PhoneCall, Briefcase, Award } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()

  const [isEmployee, setIsEmployee] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    address: '',
    emergency_contact: '',
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch employee profile details if they are in a workspace schema
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const empProfile = await getEmployeeProfile()
        setIsEmployee(true)
        setFormData({
          full_name: empProfile.full_name || '',
          email: empProfile.email || '',
          phone: empProfile.phone || '',
          department: empProfile.department || '',
          designation: empProfile.designation || '',
          address: empProfile.address || '',
          emergency_contact: empProfile.emergency_contact || '',
        })
        if (empProfile.profile_image) {
          const API_HOST = window.location.hostname
          setPhotoPreview(`http://${API_HOST}:8000${empProfile.profile_image}`)
        }
      } catch (err) {
        // Fallback to standard User model details if not an Employee
        setIsEmployee(false)
        setFormData({
          full_name: user?.user?.first_name || '',
          email: user?.user?.email || '',
          phone: user?.user?.phone || '',
          department: '',
          designation: '',
          address: '',
          emergency_contact: '',
        })
      }
    };
    if (user) {
      loadProfile()
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEmployee) {
        // Update via Employee Profile API
        const payload = new FormData()
        payload.append('full_name', formData.full_name)
        payload.append('phone', formData.phone)
        payload.append('department', formData.department)
        payload.append('designation', formData.designation)
        payload.append('address', formData.address)
        payload.append('emergency_contact', formData.emergency_contact)
        if (photoFile) {
          payload.append('profile_image', photoFile)
        }

        await updateEmployeeProfile(payload)
      } else {
        // Fallback to generic User update
        const payload = new FormData()
        payload.append('first_name', formData.full_name)
        payload.append('email', formData.email)
        payload.append('phone', formData.phone)
        if (photoFile) {
          payload.append('photo', photoFile)
        }

        await axiosInstance.put('/auth/me/', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      toast.success('Profile details updated successfully!')
      // Force reload auth user details
      window.location.reload()
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update profile.'
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const userRole = user?.role || user?.user?.role || 'employee'
  const isDeliveryExecutive = userRole === 'employee'

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2rem] p-8 sm:p-12 shadow-xl border border-border-light relative overflow-hidden mt-6 animate-fade-in text-left">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-40 -mr-10 -mt-10 pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <div className="bg-primary/10 p-2.5 rounded-xl text-primary-dark shadow-sm">
          <User className="h-5 w-5" />
        </div>
        <span className="text-sm font-bold text-dark-text tracking-wide uppercase">My Workspace Account</span>
      </div>

      <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-1.5">
        Profile Settings
      </h1>
      <p className="text-muted-gray mb-8 text-sm leading-relaxed">
        Update your personal employee profile details, location, and avatar picture.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image upload */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-bg-tint/40 rounded-2xl border border-border-light">
          <div className="relative w-20 h-20 rounded-full bg-slate-200 border-2 border-border-light flex items-center justify-center overflow-hidden shadow-inner">
            {photoPreview ? (
              <img src={photoPreview} alt="User Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
            <label className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <span className="block text-sm font-bold text-dark-text mb-1">Avatar Image</span>
            <p className="text-muted-gray text-xs mb-3">Upload a clean square profile picture.</p>
            <label className="bg-white border border-border-light text-dark-text hover:border-primary/20 hover:bg-bg-tint/50 active:scale-[0.98] py-1.5 px-3 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer inline-block">
              Choose Avatar
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5" />
              </div>
              <input
                type="text"
                name="full_name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-slate-50 text-slate-400 outline-none text-sm cursor-not-allowed"
                disabled
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
              />
            </div>
          </div>

          {isEmployee && (
            <>
              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    name="department"
                    placeholder="e.g. Operations"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    disabled={isDeliveryExecutive}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Designation
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    name="designation"
                    placeholder="e.g. Delivery Driver"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                    disabled={isDeliveryExecutive}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Emergency Contact Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <PhoneCall className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    name="emergency_contact"
                    placeholder="Emergency Contact"
                    value={formData.emergency_contact}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-2">
                  Personal Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 pt-3 flex items-start pointer-events-none text-slate-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <textarea
                    name="address"
                    placeholder="Your complete address..."
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border-light bg-white focus:border-primary outline-none transition-all duration-200 focus:ring-4 focus:ring-primary/10 text-sm resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 active:scale-[0.98] text-white py-3.5 px-6 rounded-xl font-bold shadow-lg shadow-primary/15 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span>Save Profile</span>
            </>
          )}
        </button>
      </form>

      {/* Security Section (MFA Setup Option) */}
      {(userRole === 'company_admin' || userRole === 'super_admin') && (
        <div className="mt-8 pt-8 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div>
            <span className="block text-sm font-bold text-dark-text">Multi-Factor Authentication (MFA)</span>
            <p className="text-muted-gray text-xs mt-1">Enhance account security by requiring a 6-digit Google Authenticator code on sign in.</p>
          </div>
          <div>
            {user?.user?.is_mfa_enabled ? (
              <span className="bg-primary/10 text-primary-dark border border-primary/20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-block">
                Enabled
              </span>
            ) : (
              <Link
                to="/mfa/setup"
                className="bg-[#061a15] hover:opacity-95 active:scale-[0.98] text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 inline-block text-center cursor-pointer"
              >
                Configure MFA
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
