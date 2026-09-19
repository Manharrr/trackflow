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
} from '../services/authSession'

const AuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

function authReducer(state, action) {
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

export const getTenantWorkspaceOrigin = (tenantOrUrl) => {
  if (!tenantOrUrl) return null

  const currentHostname = window.location.hostname
  const isLocal =
    currentHostname === 'localhost' ||
    currentHostname.endsWith('.localhost') ||
    currentHostname === '127.0.0.1'

  const schemaName = typeof tenantOrUrl === 'object' ? tenantOrUrl.schema_name : null
  const rawUrl = typeof tenantOrUrl === 'string' ? tenantOrUrl : tenantOrUrl.workspace_url

  if (isLocal) {
    const port = window.location.port ? `:${window.location.port}` : ':5173'
    const protocol = window.location.protocol || 'http:'
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl)
        return `${protocol}//${parsed.hostname}${port}`
      } catch {
        // fallback
      }
    }
    const host = schemaName ? `${schemaName}.localhost` : currentHostname
    return `${protocol}//${host}${port}`
  }

  // Production: Always HTTPS, NEVER append :5173 or dev ports
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      let hostname = parsed.hostname
      // If backend mistakenly sent a .localhost domain or local IP in production, map to production domain
      if ((hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === 'localhost') && schemaName) {
        hostname = `${schemaName}.manhargurukkal.site`
      }
      return `https://${hostname}`
    } catch {
      // fallback
    }
  }

  if (schemaName) {
    const baseDomain = currentHostname.includes('manhargurukkal.site')
      ? 'manhargurukkal.site'
      : currentHostname.replace(/^[a-z0-9-]+\./, '')
    return `https://${schemaName}.${baseDomain}`
  }

  return window.location.origin
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

  const refreshAccessToken = async (customRefreshToken = null) => {
    return tokenRefresher.current.refresh(customRefreshToken)
  }

  // Application Startup & Initialization Flow
  useEffect(() => {
    const initAuth = async () => {
      if (isInitializingRef.current) return
      isInitializingRef.current = true

      const urlParams = new URLSearchParams(window.location.search)
      const urlRefreshToken = urlParams.get('auth_transfer') || urlParams.get('refresh_token')

      if (urlRefreshToken) {
        sessionStorage.removeItem('logged_out')
        setStoredRefreshToken(urlRefreshToken)
      }

      const isLoggedOut = urlParams.get('logged_out') === 'true' || sessionStorage.getItem('logged_out') === 'true'

      if (isLoggedOut && !urlRefreshToken) {
        if (urlParams.get('logged_out')) {
          urlParams.delete('logged_out')
          const newSearch = urlParams.toString()
          const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '')
          window.history.replaceState({}, '', newPath)
        }
        sessionStorage.removeItem('logged_out')
        clearStoredTokens(axiosInstance)
        dispatch({ type: 'LOGOUT' })
        isInitializingRef.current = false
        return
      }

      const activeRefreshToken = urlRefreshToken || getStoredRefreshToken()

      // If no refresh token exists, do NOT make a refresh request
      if (!activeRefreshToken) {
        clearStoredTokens(axiosInstance)
        dispatch({ type: 'LOGOUT' })
        isInitializingRef.current = false
        return
      }

      try {
        await refreshAccessToken(activeRefreshToken)

        if (urlRefreshToken) {
          urlParams.delete('auth_transfer')
          urlParams.delete('refresh_token')
          const newSearch = urlParams.toString()
          const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '')
          window.history.replaceState({}, '', newPath)
        }

        const meRes = await axiosInstance.get('/auth/me/')
        const role = meRes.data.role || meRes.data.user?.role
        if (role === 'company_admin' && meRes.data.company_status === 'approved') {
          try {
            const subRes = await getSubscriptionStatus()
            setSubscription(subRes.data)
          } catch (err) {
            console.error('Failed to load subscription status:', err)
          }
        }
        dispatch({ type: 'LOGIN_SUCCESS', payload: meRes.data })
      } catch {
        clearStoredTokens(axiosInstance)
        dispatch({ type: 'LOGOUT' })
      } finally {
        isInitializingRef.current = false
      }
    }

    initAuth()
  }, [])

  // Axios Response Interceptor (Auto-refresh on 401)
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
          const storedRefresh = getStoredRefreshToken()
          if (!storedRefresh) {
            // No refresh token available; abort without calling refresh endpoint
            clearStoredTokens(axiosInstance)
            dispatch({ type: 'LOGOUT' })
            window.location.href = `${window.location.origin}/?logged_out=true`
            return Promise.reject(error)
          }

          originalRequest._retry = true
          try {
            const newAccess = await refreshAccessToken()
            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
            return axiosInstance(originalRequest)
          } catch (err) {
            clearStoredTokens(axiosInstance)
            dispatch({ type: 'LOGOUT' })
            window.location.href = `${window.location.origin}/?logged_out=true`
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

    const currentOrigin = window.location.origin
    const targetOrigin = getTenantWorkspaceOrigin(res.data.tenant)

    if (targetOrigin && currentOrigin !== targetOrigin) {
      isInitializingRef.current = true
      const url = new URL(`${targetOrigin}/dashboard`)
      if (res.data.refresh) {
        url.searchParams.set('auth_transfer', res.data.refresh)
      }
      return { redirectUrl: url.toString() }
    }

    const meRes = await axiosInstance.get('/auth/me/')
    dispatch({ type: 'LOGIN_SUCCESS', payload: meRes.data })

    const role = meRes.data.role || meRes.data.user?.role
    let subData = null
    if (role === 'company_admin' && meRes.data.company_status === 'approved') {
      try {
        const subRes = await getSubscriptionStatus()
        setSubscription(subRes.data)
        subData = subRes.data
      } catch (err) {
        console.error('Failed to load subscription status:', err)
      }
    }

    let targetPath = '/dashboard'
    if (role === 'super_admin') {
      targetPath = '/super-admin'
    } else if (role === 'company_admin') {
      if (subData && subData.subscription_status !== 'active') {
        targetPath = '/payment'
      } else {
        targetPath = '/dashboard'
      }
    } else if (role === 'operations_manager') {
      targetPath = '/operations'
    } else if (role === 'employee') {
      targetPath = '/employee'
    }

    const destOrigin = targetOrigin || currentOrigin
    return { redirectUrl: `${destOrigin}${targetPath}`, subscription: subData, role }
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

    const currentOrigin = window.location.origin
    const targetOrigin = getTenantWorkspaceOrigin(res.data.tenant)

    if (targetOrigin && currentOrigin !== targetOrigin) {
      isInitializingRef.current = true
      const url = new URL(`${targetOrigin}/dashboard`)
      if (res.data.refresh) {
        url.searchParams.set('auth_transfer', res.data.refresh)
      }
      return { redirectUrl: url.toString() }
    }

    const meRes = await axiosInstance.get('/auth/me/')
    dispatch({ type: 'LOGIN_SUCCESS', payload: meRes.data })

    const role = meRes.data.role || meRes.data.user?.role
    let subData = null
    if (role === 'company_admin' && meRes.data.company_status === 'approved') {
      try {
        const subRes = await getSubscriptionStatus()
        setSubscription(subRes.data)
        subData = subRes.data
      } catch (err) {
        console.error('Failed to load subscription status:', err)
      }
    }

    let targetPath = '/dashboard'
    if (role === 'super_admin') {
      targetPath = '/super-admin'
    } else if (role === 'company_admin') {
      if (subData && subData.subscription_status !== 'active') {
        targetPath = '/payment'
      } else {
        targetPath = '/dashboard'
      }
    } else if (role === 'operations_manager') {
      targetPath = '/operations'
    } else if (role === 'employee') {
      targetPath = '/employee'
    }

    const destOrigin = targetOrigin || currentOrigin
    return { redirectUrl: `${destOrigin}${targetPath}`, subscription: subData, role }
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

    const currentOrigin = window.location.origin
    const targetOrigin = getTenantWorkspaceOrigin(tenant || workspaceUrl)

    if (targetOrigin && currentOrigin !== targetOrigin) {
      isInitializingRef.current = true
      const url = new URL(`${targetOrigin}/dashboard`)
      if (refreshToken) {
        url.searchParams.set('auth_transfer', refreshToken)
      }
      return { redirectUrl: url.toString() }
    }

    const meRes = await axiosInstance.get('/auth/me/')
    dispatch({ type: 'LOGIN_SUCCESS', payload: meRes.data })

    const role = meRes.data.role || meRes.data.user?.role
    let subData = null
    if (role === 'company_admin' && meRes.data.company_status === 'approved') {
      try {
        const subRes = await getSubscriptionStatus()
        setSubscription(subRes.data)
        subData = subRes.data
      } catch (err) {
        console.error('Failed to load subscription status:', err)
      }
    }

    let targetPath = '/dashboard'
    if (role === 'super_admin') {
      targetPath = '/super-admin'
    } else if (role === 'company_admin') {
      if (subData && subData.subscription_status !== 'active') {
        targetPath = '/payment'
      } else {
        targetPath = '/dashboard'
      }
    } else if (role === 'operations_manager') {
      targetPath = '/operations'
    } else if (role === 'employee') {
      targetPath = '/employee'
    }

    const destOrigin = targetOrigin || currentOrigin
    return { redirectUrl: `${destOrigin}${targetPath}`, user: meRes.data, subscription: subData }
  }

  const logout = async () => {
    setLoggingOut(true)
    try {
      sessionStorage.removeItem('logged_out')
      sessionStorage.setItem('logged_out', 'true')
      const currentRefresh = getStoredRefreshToken()
      await axiosInstance.post('/auth/logout/', currentRefresh ? { refresh: currentRefresh } : {})
    } catch {
      // Ignore logout API failures
    } finally {
      clearStoredTokens(axiosInstance)
      setSubscription(null)
      dispatch({ type: 'LOGOUT' })
      setLoggingOut(false)
      window.location.href = `${window.location.origin}/?logged_out=true`
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