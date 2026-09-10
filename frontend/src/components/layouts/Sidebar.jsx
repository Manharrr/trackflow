import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Package,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  CreditCard,
} from 'lucide-react'

export default function Sidebar() {
  const { user, logout, subscription } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  let menu = []

  if (user?.role === 'super_admin') {
    menu = [
      { name: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
      { name: 'Companies', path: '/super-admin/companies', icon: Building2 },
      { name: 'Analytics', path: '/super-admin/analytics', icon: BarChart3 },
      // { name: 'Profile', path: '/profile', icon: User },
    ]
  } else if (user?.role === 'company_admin') {
    if (subscription && subscription.subscription_status !== 'active') {
      menu = [
        { name: 'Subscription', path: '/payment', icon: CreditCard },
      ]
    } else {
      menu = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Orders', path: '/dashboard/orders', icon: Package },
        { name: 'Employees', path: '/dashboard/employees', icon: Users },
        { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Chat', path: '/chat', icon: MessageSquare },
      ]
    }
  } else if (user?.role === 'operations_manager') {
    menu = [
      { name: 'Dashboard', path: '/operations', icon: LayoutDashboard },
      { name: 'Orders', path: '/operations/orders', icon: Package },
      { name: 'Employees', path: '/dashboard/employees', icon: Users },
      { name: 'Chat', path: '/chat', icon: MessageSquare },
    ]
  } else {
    menu = [
      { name: 'Dashboard', path: '/employee', icon: LayoutDashboard },
      { name: 'Assigned Orders', path: '/employee/orders', icon: Package },
      { name: 'Chat', path: '/chat', icon: MessageSquare },
      // { name: 'Profile', path: '/employee/profile', icon: User },
    ]
  }

  return (
    <aside
      className={`bg-white border-r border-border-light/70 flex flex-col justify-between transition-all duration-300 relative z-20 h-screen sticky top-0 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div>
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-border-light/50">
          {!collapsed && (
            <h1 className="text-xl font-extrabold text-dark-text tracking-tight flex items-center gap-2.5">
              <span className="bg-gradient-to-tr from-primary to-primary-dark text-white w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-md shadow-primary/10">
                T
              </span>
              <span>TrackFlow<span className="text-primary font-black">.ai</span></span>
            </h1>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-dark text-white flex items-center justify-center font-extrabold text-lg mx-auto shadow-md shadow-primary/10">
              T
            </div>
          )}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg border border-border-light/60 hover:bg-bg-tint text-muted-gray hover:text-dark-text transition-colors absolute right-[-14px] top-6.5 bg-white shadow-sm cursor-pointer z-30"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Sidebar NavLinks */}
        <nav className="p-4 space-y-1.5 mt-4">
          {menu.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.name === 'Dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-250 relative group ${
                    isActive
                      ? 'bg-primary/10 text-primary-dark shadow-sm'
                      : 'text-muted-gray hover:bg-bg-tint/60 hover:text-dark-text'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active vertical bar marker */}
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                    )}
                    <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-dark-text'}`} />
                    {!collapsed && <span>{item.name}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Footer Logout Button */}
      <div className="p-4 border-t border-border-light/50">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200 cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}