/**
 * Auth Session and Token Management Service
 * 
 * Manages access token and refresh token storage, automatic deduplicated refresh,
 * and safe lifecycle transitions (login, refresh, logout) without sending empty refresh requests.
 */

export const REFRESH_TOKEN_KEY = 'trackflow_refresh_token';

// In-memory token cache
let inMemoryAccessToken = null;
let inMemoryRefreshToken = null;
let isLoggingOutFlag = false;

export const setLoggingOut = (value) => {
  isLoggingOutFlag = Boolean(value);
};

export const isLoggingOut = () => isLoggingOutFlag;

export const getStoredRefreshToken = () => {
  if (inMemoryRefreshToken) {
    return inMemoryRefreshToken;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const local = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (local) return local;
    }
    if (typeof sessionStorage !== 'undefined') {
      const session = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (session) return session;
    }
  } catch {
    // Storage access may fail in restricted/private browsing modes
  }
  return null;
};

export const setStoredRefreshToken = (token) => {
  inMemoryRefreshToken = token || null;
  try {
    if (token) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(REFRESH_TOKEN_KEY, token);
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(REFRESH_TOKEN_KEY);
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

export const getStoredAccessToken = () => inMemoryAccessToken;

export const setStoredAccessToken = (token, axiosClient = null) => {
  inMemoryAccessToken = token || null;
  if (axiosClient && axiosClient.defaults?.headers?.common) {
    if (token) {
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axiosClient.defaults.headers.common['Authorization'];
    }
  }
};

export const clearStoredTokens = (axiosClient = null) => {
  setStoredAccessToken(null, axiosClient);
  setStoredRefreshToken(null);
};

/**
 * Creates a deduplicated token refresher.
 * Guarantees:
 * 1. If no refresh token is present, NO HTTP request is made.
 * 2. Concurrent requests share a single in-flight refresh promise.
 * 3. On success, updates both access token and stored refresh token.
 * 4. On failure, clears tokens and triggers onLogout callback.
 */
export const createTokenRefresher = ({ axiosClient, onLogout = () => {} }) => {
  let inFlightRefreshPromise = null;

  const refresh = async (customRefreshToken = null) => {
    // Reuse existing promise if a refresh is already in flight
    if (inFlightRefreshPromise) {
      return inFlightRefreshPromise;
    }

    // Never attempt refresh if logout has been initiated
    if (isLoggingOutFlag) {
      throw new Error('Logout in progress');
    }

    const tokenToUse = customRefreshToken || getStoredRefreshToken();

    // Critical: Do NOT make a request if no refresh token exists
    if (!tokenToUse) {
      clearStoredTokens(axiosClient);
      onLogout();
      throw new Error('No refresh token available');
    }

    inFlightRefreshPromise = (async () => {
      try {
        const payload = { refresh: tokenToUse };
        const response = await axiosClient.post('/auth/token/refresh/', payload);

        const newAccess = response.data?.access;
        const newRefresh = response.data?.refresh || tokenToUse;

        setStoredAccessToken(newAccess, axiosClient);
        setStoredRefreshToken(newRefresh);

        return newAccess;
      } catch (err) {
        clearStoredTokens(axiosClient);
        onLogout();
        throw err;
      } finally {
        inFlightRefreshPromise = null;
      }
    })();

    return inFlightRefreshPromise;
  };

  return { refresh };
};
