import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react'
import axiosInstance from '../api/axios'
import { getSubscriptionStatus } from '../services/paymentService'
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  setStoredAccessToken,
  clearStoredTokens,
  createTokenRefresher,
  setLoggingOut,
  isLoggingOut,
  getTenantWorkspaceOrigin,
  getRootOrigin,
  isRootOrigin,
  buildTenantRedirectUrl,
  cleanAuthTransferFromUrl,
  getRoleDefaultPath,
} from '../services/authSession'

export { getTenantWorkspaceOrigin, getRootOrigin, isRootOrigin, getRoleDefaultPath }

const AuthContext = createContext()

export const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false }
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const [subscription, setSubscription] = useState(null)
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false)
  const isInitializingRef = useRef(false)
  const tokenRefresher = useRef(null)

  if (!tokenRefresher.current) {
    tokenRefresher.current = createTokenRefresher({
      axiosClient: axiosInstance,
      onLogout: () => {
        dispatch({ type: 'LOGOUT' })
      },
    })
  }

  const refreshSubscription = async (params = {}) => {
    try {
      const res = await getSubscriptionStatus(params)
      setSubscription(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
      return null
    }
  }

  const setAccessToken = (token) => {
    setStoredAccessToken(token, axiosInstance)
  }

  const refreshAccessToken = async (customRefreshToken = null, options = {}) => {
    return tokenRefresher.current.refresh(customRefreshToken, options)
  }

  // Application Startup & Initialization Flow
  useEffect(() => {
    const initAuth = async () => {
      if (isInitializingRef.current) return
      isInitializingRef.current = true

      // Clean any stale auth_transfer parameters from URL if present
      cleanAuthTransferFromUrl(window)

      const urlParams = new URLSearchParams(window.location.search)
      const isLoggedOut = urlParams.get('logged_out') === 'true' || sessionStorage.getItem('logged_out') === 'true'

      if (isLoggedOut) {
        if (urlParams.get('logged_out') === 'true') {
          sessionStorage.setItem('logged_out', 'true')
        }
        setLoggingOut(false)
        clearStoredTokens(axiosInstance)
        dispatch({ type: 'LOGOUT' })
        isInitializingRef.current = false
        return
      }

      setLoggingOut(false)

      try {
        await refreshAccessToken(null, { allowCookie: true })

        const meRes = await axiosInstance.get('/auth/me/')
        const role = meRes.data.role || meRes.data.user?.role

        // Synchronize subscription retrieval before finishing initialization to eliminate race conditions
        if (role === 'company_admin' && meRes.data.company_status === 'approved') {
          setIsSubscriptionLoading(true)
          try {
            const subRes = await getSubscriptionStatus()
            setSubscription(subRes.data)
          } catch (err) {
            console.error('Failed to load subscription status:', err)
            setSubscription(null)
          } finally {
            setIsSubscriptionLoading(false)
          }
        }

        dispatch({ type: 'LOGIN_SUCCESS', payload: meRes.data })

        // Check if an authenticated company user is on root domain on a protected path
        if (role !== 'super_admin') {
          const tenantOrigin = getTenantWorkspaceOrigin(meRes.data.tenant || meRes.data)
          if (tenantOrigin && window.location.origin !== tenantOrigin) {
            const path = window.location.pathname
            if (path.startsWith('/dashboard') || path.startsWith('/operations') || path.startsWith('/employee') || path.startsWith('/payment')) {
              const redirectUrl = buildTenantRedirectUrl({
                tenant: meRes.data.tenant || meRes.data,
                currentOrigin: window.location.origin,
                targetPath: `${path}${window.location.search}`,
              })
              window.location.replace(redirectUrl || `${tenantOrigin}${path}${window.location.search}`)
              return
            }
          }
        }
      } catch {
        setLoggingOut(false)
        clearStoredTokens(axiosInstance)
        dispatch({ type: 'LOGOUT' })
      } finally {
        isInitializingRef.current = false
      }
    }

    initAuth()
  }, [])

  // Axios Response Interceptor (Auto-refresh on 401 with Cookie support for Tenant subdomains)
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isInitializingRef.current &&
          !isLoggingOut() &&
          originalRequest.url &&
          !originalRequest.url.includes('/auth/logout/') &&
          !originalRequest.url.includes('/auth/token/refresh/') &&
          !originalRequest.url.includes('/auth/login/')
        ) {
          originalRequest._retry = true
          try {
            // Attempt refresh with allowCookie: true to support cross-subdomain tenant workspaces
            const newAccess = await refreshAccessToken(null, { allowCookie: true })
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
            return axiosInstance(originalRequest)
          } catch (err) {
            clearStoredTokens(axiosInstance)
            dispatch({ type: 'LOGOUT' })
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              const rootOrigin = getRootOrigin(window)
              window.location.href = `${rootOrigin}/login?logged_out=true`
            }
            return Promise.reject(err)
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axiosInstance.interceptors.response.eject(interceptor)
  }, [])

  const login = async (phone, password, workspace_code = null) => {
    sessionStorage.removeItem('logged_out')

    const payload = { phone, password }
    if (workspace_code) payload.workspace_code = workspace_code

    const res = await axiosInstance.post('/auth/login/', payload)

    if (res.data.company_status === 'pending' || res.data.pending) {
      return { pending: true }
    }
    if (res.data.phone_verify) return res.data
    if (res.data.mfa_required) return res.data

    if (res.data.access) {
      setAccessToken(res.data.access)
    }
    if (res.data.refresh) {
      setStoredRefreshToken(res.data.refresh)
    }

    let meData = null
    let role = res.data.user?.role
    let subData = null

    try {
      const meRes = await axiosInstance.get('/auth/me/')
      meData = meRes.data
      role = meData.role || meData.user?.role || role
      if (role === 'company_admin' && meData.company_status === 'approved') {
        setIsSubscriptionLoading(true)
        try {
          const subRes = await getSubscriptionStatus()
          subData = subRes.data
          setSubscription(subRes.data)
        } catch (err) {
          console.error('Failed to load subscription status:', err)
          setSubscription(null)
        } finally {
          setIsSubscriptionLoading(false)
        }
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: meData })
    } catch {
      if (res.data.user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.user })
      }
    }

    const targetPath = getRoleDefaultPath(role, subData)

    if (role !== 'super_admin') {
      const tenantRedirect = buildTenantRedirectUrl({
        tenant: res.data.tenant || meData?.tenant || res.data,
        currentOrigin: window.location.origin,
        targetPath,
      })

      if (tenantRedirect) {
        isInitializingRef.current = true
        return { redirectUrl: tenantRedirect, tenant: res.data.tenant, role, user: meData || res.data.user }
      }
    }

    return { redirectUrl: targetPath, role, user: meData || res.data.user }
  }

  const googleLogin = async (token, workspace_code = null) => {
    sessionStorage.removeItem('logged_out')

    const payload = { token }
    if (workspace_code) payload.workspace_code = workspace_code

    const res = await axiosInstance.post('/auth/google/', payload)

    if (res.data.phone_verify) return res.data
    if (res.data.company_status === 'pending' || res.data.pending) return { pending: true }
    if (res.data.mfa_required) return res.data

    if (res.data.access) {
      setAccessToken(res.data.access)
    }
    if (res.data.refresh) {
      setStoredRefreshToken(res.data.refresh)
    }

    let meData = null
    let role = res.data.user?.role
    let subData = null

    try {
      const meRes = await axiosInstance.get('/auth/me/')
      meData = meRes.data
      role = meData.role || meData.user?.role || role
      if (role === 'company_admin' && meData.company_status === 'approved') {
        setIsSubscriptionLoading(true)
        try {
          const subRes = await getSubscriptionStatus()
          subData = subRes.data
          setSubscription(subRes.data)
        } catch (err) {
          console.error('Failed to load subscription status:', err)
          setSubscription(null)
        } finally {
          setIsSubscriptionLoading(false)
        }
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: meData })
    } catch {
      if (res.data.user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.user })
      }
    }

    const targetPath = getRoleDefaultPath(role, subData)

    if (role !== 'super_admin') {
      const tenantRedirect = buildTenantRedirectUrl({
        tenant: res.data.tenant || meData?.tenant || res.data,
        currentOrigin: window.location.origin,
        targetPath,
      })

      if (tenantRedirect) {
        isInitializingRef.current = true
        return { redirectUrl: tenantRedirect, tenant: res.data.tenant, role, user: meData || res.data.user }
      }
    }

    return { redirectUrl: targetPath, role, user: meData || res.data.user }
  }

  const register = async (email, username, password, confirm_password) => {
    const res = await axiosInstance.post('/auth/register/', {
      email, username, password, confirm_password,
    })
    if (res.data.access) {
      setAccessToken(res.data.access)
    }
    if (res.data.refresh) {
      setStoredRefreshToken(res.data.refresh)
    }
    dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.user })
    return res.data
  }

  const completeMfaLogin = async (token, workspaceUrl = null, refreshToken = null, tenant = null) => {
    if (token) {
      setAccessToken(token)
    }
    if (refreshToken) {
      setStoredRefreshToken(refreshToken)
    }

    let meData = null
    let role = null
    let subData = null

    try {
      const meRes = await axiosInstance.get('/auth/me/')
      meData = meRes.data
      role = meData.role || meData.user?.role
      if (role === 'company_admin' && meData.company_status === 'approved') {
        setIsSubscriptionLoading(true)
        try {
          const subRes = await getSubscriptionStatus()
          subData = subRes.data
          setSubscription(subRes.data)
        } catch (err) {
          console.error('Failed to load subscription status:', err)
          setSubscription(null)
        } finally {
          setIsSubscriptionLoading(false)
        }
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: meData })
    } catch {
      // fallback
    }

    const targetPath = getRoleDefaultPath(role, subData)

    if (role !== 'super_admin') {
      const tenantRedirect = buildTenantRedirectUrl({
        tenant: tenant || workspaceUrl || meData?.tenant,
        currentOrigin: window.location.origin,
        targetPath,
      })

      if (tenantRedirect) {
        isInitializingRef.current = true
        return { redirectUrl: tenantRedirect, tenant: tenant, role, user: meData }
      }
    }

    return { redirectUrl: targetPath, role, user: meData }
  }

  const logout = async () => {
    setLoggingOut(true)
    try {
      sessionStorage.setItem('logged_out', 'true')
      const currentRefresh = getStoredRefreshToken()
      await axiosInstance.post(
        '/auth/logout/',
        currentRefresh ? { refresh: currentRefresh } : {},
        { timeout: 3000 }
      )
    } catch {
      // Ignore logout API failures
    } finally {
      clearStoredTokens(axiosInstance)
      setSubscription(null)
      const rootOrigin = getRootOrigin(window)
      window.location.href = `${rootOrigin}/login?logged_out=true`
    }
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      subscription,
      setSubscription,
      isSubscriptionLoading,
      refreshSubscription,
      login,
      googleLogin,
      register,
      logout,
      completeMfaLogin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}