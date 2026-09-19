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

/**
 * Resolves the canonical tenant workspace origin.
 * In local environment: http://<schema>.localhost:5173
 * In production: https://<domain> or https://<schema>.manhargurukkal.site (NEVER dev port)
 */
export const getTenantWorkspaceOrigin = (tenantOrUrl, windowObj = (typeof window !== 'undefined' ? window : null)) => {
  if (!tenantOrUrl) return null;

  const currentHostname = windowObj?.location?.hostname || '';
  const isLocal =
    currentHostname === 'localhost' ||
    currentHostname.endsWith('.localhost') ||
    currentHostname === '127.0.0.1';

  let schemaName = null;
  let rawUrl = null;

  if (typeof tenantOrUrl === 'string') {
    if (tenantOrUrl.startsWith('http://') || tenantOrUrl.startsWith('https://')) {
      rawUrl = tenantOrUrl;
    } else {
      schemaName = tenantOrUrl.trim().toLowerCase();
    }
  } else if (typeof tenantOrUrl === 'object') {
    schemaName = (tenantOrUrl.schema_name || tenantOrUrl.tenant?.schema_name || '').trim().toLowerCase() || null;
    rawUrl = tenantOrUrl.workspace_url || tenantOrUrl.tenant?.workspace_url || null;
  }

  if (isLocal) {
    const port = windowObj?.location?.port ? `:${windowObj.location.port}` : ':5173';
    const protocol = windowObj?.location?.protocol || 'http:';
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        return `${protocol}//${parsed.hostname}${port}`;
      } catch {
        // fallback
      }
    }
    const host = schemaName ? `${schemaName}.localhost` : currentHostname;
    return `${protocol}//${host}${port}`;
  }

  // Production: Always HTTPS, NEVER append :5173 or dev ports
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      let hostname = parsed.hostname;
      if ((hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === 'localhost') && schemaName) {
        const baseDomain = currentHostname.includes('manhargurukkal.site')
          ? 'manhargurukkal.site'
          : currentHostname.replace(/^[a-z0-9-]+\./, '');
        hostname = `${schemaName}.${baseDomain}`;
      }
      return `https://${hostname}`;
    } catch {
      // fallback
    }
  }

  if (schemaName) {
    const baseDomain = currentHostname.includes('manhargurukkal.site')
      ? 'manhargurukkal.site'
      : currentHostname.replace(/^[a-z0-9-]+\./, '');
    return `https://${schemaName}.${baseDomain}`;
  }

  return null;
};

/**
 * Builds dynamic redirect URL to tenant workspace if on a different origin.
 * Returns absolute URL string with auth_transfer if redirection is required, or null if already on target origin.
 */
export const buildTenantRedirectUrl = ({
  tenant,
  currentOrigin = (typeof window !== 'undefined' ? window.location.origin : ''),
  targetPath = '/dashboard',
  refreshToken = null,
  windowObj = (typeof window !== 'undefined' ? window : null),
}) => {
  const targetOrigin = getTenantWorkspaceOrigin(tenant, windowObj);
  if (!targetOrigin) return null;

  const normalizedCurrent = (currentOrigin || '').replace(/\/+$/, '').toLowerCase();
  const normalizedTarget = targetOrigin.replace(/\/+$/, '').toLowerCase();

  if (normalizedCurrent !== normalizedTarget) {
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const url = new URL(`${normalizedTarget}${cleanPath}`);
    if (refreshToken) {
      url.searchParams.set('auth_transfer', refreshToken);
    }
    return url.toString();
  }

  return null;
};

/**
 * Cleans auth_transfer and refresh_token from query params using history.replaceState,
 * ensuring the browser remains on the current tenant origin.
 */
export const cleanAuthTransferFromUrl = (windowObj = (typeof window !== 'undefined' ? window : null)) => {
  if (!windowObj?.location?.search || !windowObj?.history?.replaceState) return;

  const urlParams = new URLSearchParams(windowObj.location.search);
  const hasTransfer = urlParams.has('auth_transfer') || urlParams.has('refresh_token');

  if (hasTransfer) {
    urlParams.delete('auth_transfer');
    urlParams.delete('refresh_token');
    const newSearch = urlParams.toString();
    const newPath = windowObj.location.pathname + (newSearch ? `?${newSearch}` : '');
    windowObj.history.replaceState({}, '', newPath);
  }
};
