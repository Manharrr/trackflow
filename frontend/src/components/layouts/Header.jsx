import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { User, Settings, Lock, LogOut, ChevronDown } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import { getApiBaseOrigin } from '../../services/authSession'

export default function Header() {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const apiOrigin = getApiBaseOrigin(window)
  const resolveAssetUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`
  }

  const tenantLogo = resolveAssetUrl(user?.tenant?.logo)
  const tenantName = user?.tenant?.name || 'TrackFlow AI'
  const userEmail = user?.user?.email || ''
  const userRole = user?.role || 'Guest'
  const userFullName = user?.employee?.full_name || user?.user?.first_name || 'User Profile'
  const userAvatar = resolveAssetUrl(user?.employee?.profile_image)

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border-light/50 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      
      {/* Company representation */}
      <div className="flex items-center gap-3">
        {tenantLogo ? (
          <img
            src={tenantLogo}
            alt={tenantName}
            className="w-9 h-9 rounded-xl object-cover border border-border-light shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark font-extrabold border border-primary/20 text-sm shadow-sm">
            {tenantName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-left">
          <h1 className="font-extrabold text-dark-text text-sm sm:text-base tracking-tight leading-none">
            {tenantName}
          </h1>
          <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase mt-1 block">
            {userRole.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Action items */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Notification Bell */}
        <NotificationBell />

        {/* Profile Avatar Trigger */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-bg-tint rounded-xl transition-all duration-200 border border-transparent hover:border-border-light text-left cursor-pointer"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userFullName}
                className="w-8 h-8 rounded-xl object-cover border border-border-light"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-dark text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-primary/10">
                {userFullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block leading-none">
              <span className="block text-sm font-bold text-dark-text tracking-tight">
                {userFullName}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <>
              {/* Back drop click handler */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              
              <div className="absolute right-0 mt-3 w-60 bg-white border border-border-light shadow-xl rounded-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-border-light/60">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account profile</span>
                  <span className="block text-sm font-extrabold text-dark-text truncate mt-1">{userFullName}</span>
                  <span className="block text-[11px] text-muted-gray truncate font-mono mt-0.5">{userEmail}</span>
                </div>

                <div className="p-1.5 space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-muted-gray hover:text-primary-dark hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <User className="h-4.5 w-4.5 text-slate-400" />
                    My Profile
                  </Link>

                  {userRole === 'company_admin' && (
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-muted-gray hover:text-primary-dark hover:bg-primary/5 rounded-xl transition-colors"
                    >
                      <Settings className="h-4.5 w-4.5 text-slate-400" />
                      Company Settings
                    </Link>
                  )}

                  <Link
                    to="/change-password"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-muted-gray hover:text-primary-dark hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <Lock className="h-4.5 w-4.5 text-slate-400" />
                    Change Password
                  </Link>
                </div>

                <div className="border-t border-border-light/60 p-1.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-4.5 w-4.5 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  )
}