import { Navigate } from 'react-router-dom'
import { useAuth, getTenantWorkspaceOrigin, getRoleDefaultPath } from '../contexts/AuthContext'

export default function RoleRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const role = user.role || user.user?.role || 'employee'
  if (role === 'super_admin') {
    return <Navigate to="/super-admin" replace />
  }

  const targetPath = getRoleDefaultPath(role)
  const tenantOrigin = getTenantWorkspaceOrigin(user.tenant || user.tenant_data || user)
  if (tenantOrigin && window.location.origin !== tenantOrigin) {
    window.location.replace(`${tenantOrigin}${targetPath}`)
    return null
  }

  return <Navigate to={targetPath} replace />
}