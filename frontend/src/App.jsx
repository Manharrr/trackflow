import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, getTenantWorkspaceOrigin, getRootOrigin, isRootOrigin, getRoleDefaultPath, hasSharedLoggedOutCookie } from './contexts/AuthContext'
import { buildTenantRedirectUrl, isLoggingOut } from './services/authSession'

import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import ChatWidget from './components/ChatWidget/ChatWidget'
import { ChatProvider } from './features/chat/context/ChatContext'
import ChatPage from './features/chat/pages/ChatPage'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MFAPage from './pages/MFAPage'

import VerifyPhonePage from './pages/VerifyPhonePage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import WorkspaceSetupPage from './pages/WorkspaceSetupPage'

import ForgotPasswordPage from './pages/auth/ForgotpasswordPage'
import VerifyResetOTPPage from './pages/auth/VerifyResetOTPPage'
import ResetPasswordPage from './pages/auth/ResetpasswordPage'

import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard'
import CompaniesPage from './pages/super-admin/CompaniesPage'
import AnalyticsPage from './pages/super-admin/AnalyticsPage'
// import SettingsPage from './pages/super-admin/SettingsPage'

import CompanyDashboard from './pages/company-admin/CompanyDashboard'
import CompanyAnalyticsPage from './pages/company-admin/CompanyAnalyticsPage'
import CompanySetupPage from './pages/company-admin/CompanySetupPage'
import ProfilePage from './pages/company-admin/ProfilePage'
import CompanySettingsPage from './pages/company-admin/SettingsPage'
import Changepassword from './pages/auth/Changepassword'
import MFASetupPage from './pages/auth/MFASetupPage'

import OperationsDashboard from './pages/operations/OperationsDashboard'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import CompanyDetailsPage from './pages/super-admin/CompanyDetailsPage'

import OrdersDashboard from './pages/orders/OrdersDashboard'
import OrdersListPage from './pages/orders/OrdersListPage'
import OrderDetailsPage from './pages/orders/OrderDetailsPage'
import OrderCreatePage from './pages/orders/OrderCreatePage'
import EmployeeCreatePage from './pages/company-admin/employees/EmployeeCreatePage'
import EmployeeListPage from './pages/company-admin/employees/EmployeeListPage'
import EmployeeDetailsPage from './pages/company-admin/employees/EmployeeDetailsPage'
import ActivateAccountPage from './pages/auth/ActivateAccountPage'
import PaymentPage from './pages/payment/PaymentPage'
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage'
import PaymentCancelPage from './pages/payment/PaymentCancelPage'



function PublicRoute({ children }) {
    const {
        isAuthenticated,
        isLoading,
        user,
    } = useAuth()

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isExplicitlyLoggedOut =
        hasSharedLoggedOutCookie() ||
        urlParams?.get('logged_out') === 'true' ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('logged_out') === 'true') ||
        isLoggingOut()

    if (isLoading && !isExplicitlyLoggedOut) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Tenant subdomains are dedicated workspaces for authenticated users.
    // Unauthenticated access to public auth pages (/login, /register) on tenant subdomains must redirect to the central root login.
    if (!isRootOrigin() && !isAuthenticated) {
        window.location.replace(`${getRootOrigin()}/login`)
        return null
    }

    if (isAuthenticated && !isExplicitlyLoggedOut) {
        const role = user?.role || user?.user?.role
        if (role === 'super_admin') {
            return <Navigate to="/super-admin" replace />
        }

        const targetPath = getRoleDefaultPath(role)
        const tenantOrigin = getTenantWorkspaceOrigin(user?.tenant || user?.tenant_data || user)
        if (tenantOrigin && window.location.origin !== tenantOrigin) {
            const redirectUrl = buildTenantRedirectUrl({
                tenant: user?.tenant || user?.tenant_data || user,
                currentOrigin: window.location.origin,
                targetPath,
            })
            window.location.replace(redirectUrl || `${tenantOrigin}${targetPath}`)
            return null
        }

        return <Navigate to={targetPath} replace />
    }

    return children
}

export default function App() {
    return (
        <>
            <Routes>

            {/* Landing */}
            <Route
                path="/"
                element={<HomePage />}
            />

            {/* Public */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />

            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                }
            />

            <Route
                path="/mfa"
                element={<MFAPage />}
            />

            <Route
                path="/verify-phone"
                element={<VerifyPhonePage />}
            />

            <Route
                path="/workspace/setup"
                element={<WorkspaceSetupPage />}
            />

            <Route
                path="/pending-approval"
                element={<PendingApprovalPage />}
            />

            <Route
                path="/forgot-password"
                element={<ForgotPasswordPage />}
            />

            <Route
                path="/verify-reset-otp"
                element={<VerifyResetOTPPage />}
            />

            <Route
                path="/reset-password"
                element={<ResetPasswordPage />}
            />

            <Route
                path="/activate-account/:token"
                element={<ActivateAccountPage />}
            />

            {/* Standalone Protected Routes (No Layout Frame) */}
            <Route
                path="/company/setup"
                element={
                    <ProtectedRoute>
                        <CompanySetupPage />
                    </ProtectedRoute>
                }
            />

            {/* Protected Layout Routes */}
            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >

                {/* Super Admin */}

                <Route
                    path="/super-admin"
                    element={<SuperAdminDashboard />}
                />

                <Route
                    path="/super-admin/companies"
                    element={<CompaniesPage />}
                />

                <Route
                    path="/super-admin/companies/:id"
                    element={<CompanyDetailsPage />}
                />

                <Route
                    path="/super-admin/analytics"
                    element={<AnalyticsPage />}
                />

                {/* <Route
                    path="/super-admin/settings"
                    element={<SettingsPage />}
                /> */}

                {/* Payment & Subscription */}
                <Route
                    path="/payment"
                    element={<PaymentPage />}
                />
                <Route
                    path="/payment/success"
                    element={<PaymentSuccessPage />}
                />
                <Route
                    path="/payment/cancel"
                    element={<PaymentCancelPage />}
                />

                {/* Company Admin & User Options */}

                <Route
                    path="/dashboard"
                    element={<CompanyDashboard />}
                />

                <Route
                    path="/company-admin"
                    element={<Navigate to="/dashboard" replace />}
                />

                <Route
                    path="/dashboard/employees"
                    element={<EmployeeListPage />}
                />

                <Route
                    path="/dashboard/employees/create"
                    element={<EmployeeCreatePage />}
                />

                <Route
                    path="/dashboard/employees/:employeeId"
                    element={<EmployeeDetailsPage />}
                />

                <Route
                    path="/operations/employees/create"
                    element={<EmployeeCreatePage />}
                />

                <Route
                    path="/dashboard/orders"
                    element={<OrdersListPage />}
                />

                <Route
                    path="/dashboard/orders/dashboard"
                    element={<OrdersDashboard />}
                />

                <Route
                    path="/dashboard/orders/create"
                    element={<OrderCreatePage />}
                />

                <Route
                    path="/orders/create"
                    element={<OrderCreatePage />}
                />

                <Route
                    path="/dashboard/orders/:orderId"
                    element={<OrderDetailsPage />}
                />

                <Route
                    path="/dashboard/orders/:orderId/edit"
                    element={<OrderCreatePage />}
                />


                <Route
                    path="/dashboard/analytics"
                    element={<CompanyAnalyticsPage />}
                />

                <Route
                    path="/profile"
                    element={<ProfilePage />}
                />

                <Route
                    path="/settings"
                    element={<CompanySettingsPage />}
                />

                <Route
                    path="/change-password"
                    element={<Changepassword />}
                />

                <Route
                    path="/mfa/setup"
                    element={<MFASetupPage />}
                />

                {/* Operations */}

                <Route
                    path="/operations"
                    element={<OperationsDashboard />}
                />
                <Route
                    path="/operations/orders"
                    element={<OrdersListPage />}
                />

                {/* Employee */}

                <Route
                    path="/employee"
                    element={<EmployeeDashboard />}
                />
                <Route
                    path="/employee/orders"
                    element={<OrdersListPage />}
                />

                {/* Chat Module */}
                <Route
                    path="/chat"
                    element={
                        <ChatProvider>
                            <ChatPage />
                        </ChatProvider>
                    }
                />
                <Route
                    path="/chat/:conversationId"
                    element={
                        <ChatProvider>
                            <ChatPage />
                        </ChatProvider>
                    }
                />

            </Route>

            {/* 404 */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />

        </Routes>
        <ChatWidget />
      </>
    )
}
