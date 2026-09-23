import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, getTenantWorkspaceOrigin, getRootOrigin, isRootOrigin } from '../contexts/AuthContext'
import { buildTenantRedirectUrl, isLoggingOut } from '../services/authSession'

// Centralized permission map matching exact paths and patterns using RegExp
const ROUTE_PERMISSIONS = {
  super_admin: [
    /^\/super-admin(\/.*)?$/,
    /^\/profile$/,
    /^\/change-password$/,
    /^\/mfa\/setup$/,
    /^\/chat(\/.*)?$/
  ],
  company_admin: [
    /^\/dashboard(\/.*)?$/,
    /^\/company-admin(\/.*)?$/,
    /^\/profile$/,
    /^\/settings$/,
    /^\/change-password$/,
    /^\/mfa\/setup$/,
    /^\/chat(\/.*)?$/,
    /^\/payment(\/.*)?$/
  ],
  operations_manager: [
    /^\/operations(\/.*)?$/,
    /^\/orders\/create$/,
    /^\/dashboard\/orders(\/.*)?$/,
    /^\/dashboard\/employees(\/.*)?$/,
    /^\/profile$/,
    /^\/settings$/,
    /^\/change-password$/,
    /^\/mfa\/setup$/,
    /^\/chat(\/.*)?$/
  ],
  employee: [
    /^\/employee(\/.*)?$/,
    // Matches detail view with UUID pattern, forbids lists /edit
    /^\/dashboard\/orders\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/,
    /^\/profile$/,
    /^\/settings$/,
    /^\/change-password$/,
    /^\/mfa\/setup$/,
    /^\/chat(\/.*)?$/
  ]
};

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user, subscription, isSubscriptionLoading } = useAuth()
  const location = useLocation()

  // If a logout is currently in progress, render nothing to avoid firing redirect guards to /payment or dashboards
  if (isLoggingOut()) {
    return null
  }

  if (isLoading || (user?.role === 'company_admin' && isSubscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (!isRootOrigin()) {
      const isLoggedOut = isLoggingOut() || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logged_out') === 'true')
      if (isLoggedOut) {
        window.location.replace(`${getRootOrigin()}/`)
        return null
      }
      window.location.replace(`${getRootOrigin()}/login`)
      return null
    }
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Pending Company Approval Check
  if (user?.company_status === 'pending') {
    if (location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />
    }
    return children
  }

  const path = location.pathname
  const role = user?.role || 'employee'

  // Tenant Domain Boundary Enforcement: Company users must navigate on their tenant workspace domain
  if (role !== 'super_admin') {
    const tenantOrigin = getTenantWorkspaceOrigin(user?.tenant || user?.tenant_data || user)
    if (tenantOrigin && window.location.origin !== tenantOrigin) {
      const redirectUrl = buildTenantRedirectUrl({
        tenant: user?.tenant || user?.tenant_data || user,
        currentOrigin: window.location.origin,
        targetPath: `${location.pathname}${location.search}`,
      })
      window.location.replace(redirectUrl || `${tenantOrigin}${location.pathname}${location.search}`)
      return null
    }
  }

  // Company Admin Subscription Gating
  if (role === 'company_admin') {
    const isPaymentRoute = /^\/payment(\/.*)?$/.test(path)
    const isAccountSetupRoute = /^\/(profile|change-password|mfa\/setup)$/.test(path)
    const isSubscriptionActive = subscription?.subscription_status === 'active'

    if (!isSubscriptionActive) {
      // Inactive subscription (payment_pending, expired, cancelled)
      // Allow payment pages and essential account setup, redirect dashboard/business routes to payment
      if (!isPaymentRoute && !isAccountSetupRoute) {
        return <Navigate to="/payment" replace />
      }
      return children
    }

    // Active subscription: prevent navigating to /payment
    if (path === '/payment') {
      return <Navigate to="/dashboard" replace />
    }
  }

  // Role Routing Access Authorization Check
  const allowedRoutes = ROUTE_PERMISSIONS[role] || [];
  const isAuthorized = allowedRoutes.some(regex => regex.test(path));

  if (!isAuthorized) {
    // Redirect to default dashboard
    if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
    if (role === 'company_admin') return <Navigate to="/dashboard" replace />;
    if (role === 'operations_manager') return <Navigate to="/operations" replace />;
    return <Navigate to="/employee" replace />;
  }

  return children
}