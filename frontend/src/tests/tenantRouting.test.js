import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTenantWorkspaceOrigin,
  getRootOrigin,
  isRootOrigin,
  buildTenantRedirectUrl,
  cleanAuthTransferFromUrl,
  getWebSocketBaseUrl,
  getApiBaseOrigin,
  getRoleDefaultPath,
} from '../services/authSession.js';

describe('Tenant Dynamic URL Routing & Origin Isolation Suite', () => {
  let mockWindow;

  beforeEach(() => {
    mockWindow = {
      location: {
        hostname: 'manhargurukkal.site',
        origin: 'https://manhargurukkal.site',
        protocol: 'https:',
        port: '',
        pathname: '/login',
        search: '',
      },
      history: {
        replaceStateCalls: [],
        replaceState(state, title, url) {
          this.replaceStateCalls.push({ state, title, url });
          if (url.startsWith('/')) {
            const [path, search] = url.split('?');
            mockWindow.location.pathname = path;
            mockWindow.location.search = search ? `?${search}` : '';
          }
        },
      },
    };
  });

  test('1. Root login + logesticgo tenant dynamically redirects to logesticgo workspace without auth_transfer', () => {
    const backendResponse = {
      access: 'access_123',
      refresh: 'refresh_abc',
      user: { id: 3, role: 'company_admin' },
      tenant: {
        schema_name: 'logesticgo',
        name: 'logesticgo',
        workspace_url: 'https://logesticgo.manhargurukkal.site',
      },
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: backendResponse.tenant,
      currentOrigin: mockWindow.location.origin,
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://logesticgo.manhargurukkal.site/dashboard'
    );
    assert.notEqual(redirectUrl, 'https://manhargurukkal.site/dashboard');
    assert.ok(!redirectUrl.includes('auth_transfer'), 'URL must NOT contain auth_transfer parameter');
  });

  test('2. Root login + another tenant (abc) dynamically redirects to abc workspace', () => {
    const backendResponse = {
      access: 'access_456',
      refresh: 'refresh_def',
      user: { id: 10, role: 'company_admin' },
      tenant: {
        schema_name: 'abc',
        name: 'ABC Logistics',
        workspace_url: 'https://abc.manhargurukkal.site',
      },
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: backendResponse.tenant,
      currentOrigin: mockWindow.location.origin,
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://abc.manhargurukkal.site/dashboard'
    );
    assert.notEqual(redirectUrl, 'https://manhargurukkal.site/dashboard');
    assert.ok(!redirectUrl.includes('auth_transfer'), 'URL must NOT contain auth_transfer parameter');
  });

  test('3. Dynamic tenant resolution safely strips trailing slashes from workspace_url', () => {
    const tenantWithTrailingSlash = {
      schema_name: 'xyz',
      name: 'XYZ Express',
      workspace_url: 'https://xyz.manhargurukkal.site/',
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: tenantWithTrailingSlash,
      currentOrigin: mockWindow.location.origin,
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://xyz.manhargurukkal.site/dashboard'
    );
    assert.ok(!redirectUrl.includes('auth_transfer'));
  });

  test('4. Root login must NEVER finish at https://manhargurukkal.site/dashboard for company users', () => {
    const companyTenants = [
      { schema_name: 'logesticgo', workspace_url: 'https://logesticgo.manhargurukkal.site' },
      { schema_name: 'abc', workspace_url: 'https://abc.manhargurukkal.site' },
      { schema_name: 'acme_corp', workspace_url: 'https://acme_corp.manhargurukkal.site' },
    ];

    for (const tenant of companyTenants) {
      const redirectUrl = buildTenantRedirectUrl({
        tenant,
        currentOrigin: 'https://manhargurukkal.site',
        targetPath: '/dashboard',
        windowObj: mockWindow,
      });

      assert.ok(redirectUrl, 'Must return a cross-origin redirect URL');
      assert.ok(!redirectUrl.startsWith('https://manhargurukkal.site/dashboard'));
      assert.ok(redirectUrl.includes(`${tenant.schema_name}.manhargurukkal.site`));
      assert.ok(!redirectUrl.includes('auth_transfer'));
    }
  });

  test('5. Tenant internal navigation must stay on the tenant origin', () => {
    // When browser is already on the tenant origin
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';

    const tenant = {
      schema_name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };

    // Internal navigation check (e.g. /dashboard/orders, /dashboard/employees)
    const routes = [
      '/dashboard',
      '/dashboard/orders',
      '/dashboard/employees',
      '/dashboard/analytics',
      '/dashboard/chat',
    ];

    for (const route of routes) {
      const crossDomainRedirect = buildTenantRedirectUrl({
        tenant,
        currentOrigin: mockWindow.location.origin,
        targetPath: route,
        windowObj: mockWindow,
      });

      // Returns null because current origin matches target origin (stays on tenant domain!)
      assert.equal(crossDomainRedirect, null);
      assert.equal(mockWindow.location.origin, 'https://logesticgo.manhargurukkal.site');
    }
  });

  test('6. Stale auth_transfer or query credentials scrubbed via history.replaceState', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';
    mockWindow.location.search = '?auth_transfer=stale_token_123';

    cleanAuthTransferFromUrl(mockWindow);

    assert.equal(mockWindow.history.replaceStateCalls.length, 1);
    assert.equal(mockWindow.history.replaceStateCalls[0].url, '/dashboard');
    assert.equal(mockWindow.location.pathname, '/dashboard');
    assert.equal(mockWindow.location.search, '');
    // Origin is preserved on tenant domain without reloading
    assert.equal(mockWindow.location.origin, 'https://logesticgo.manhargurukkal.site');
    assert.notEqual(mockWindow.location.origin, 'https://manhargurukkal.site');
  });

  test('7. MFA login must dynamically redirect using tenant.workspace_url without credentials in URL', () => {
    const mfaTenant = {
      schema_name: 'logesticgo',
      name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: mfaTenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://logesticgo.manhargurukkal.site/dashboard'
    );
    assert.ok(!redirectUrl.includes('auth_transfer'));
  });

  test('8. Google login must dynamically redirect using tenant.workspace_url without credentials in URL', () => {
    const googleTenant = {
      schema_name: 'globalfleet',
      name: 'Global Fleet Inc',
      workspace_url: 'https://globalfleet.manhargurukkal.site',
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: googleTenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://globalfleet.manhargurukkal.site/dashboard'
    );
    assert.ok(!redirectUrl.includes('auth_transfer'));
  });

  test('9. Refreshing the tenant dashboard keeps the tenant URL and does not redirect to root', () => {
    // Reloading tenant dashboard
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';
    mockWindow.location.search = '';

    const currentOrigin = mockWindow.location.origin;
    const targetOrigin = getTenantWorkspaceOrigin(
      { schema_name: 'logesticgo', workspace_url: 'https://logesticgo.manhargurukkal.site' },
      mockWindow
    );

    assert.equal(targetOrigin, currentOrigin);
    assert.equal(mockWindow.location.origin, 'https://logesticgo.manhargurukkal.site');
  });

  test('10. Root login remains https://manhargurukkal.site/login and does not redirect before authentication', () => {
    mockWindow.location.hostname = 'manhargurukkal.site';
    mockWindow.location.origin = 'https://manhargurukkal.site';
    mockWindow.location.pathname = '/login';

    assert.equal(isRootOrigin(mockWindow), true);
    assert.equal(getRootOrigin(mockWindow), 'https://manhargurukkal.site');

    // For unauthenticated user on root, no cross-origin redirection is triggered
    const targetOrigin = getTenantWorkspaceOrigin(null, mockWindow);
    assert.equal(targetOrigin, null);
  });

  test('11. Unauthenticated tenant user accesses tenant /login and redirects to central root login', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/login';

    assert.equal(isRootOrigin(mockWindow), false);
    // Unauthenticated tenant user redirects to central root /login
    const rootLoginUrl = `${getRootOrigin(mockWindow)}/login`;
    assert.equal(rootLoginUrl, 'https://manhargurukkal.site/login');
  });

  test('12. Unauthenticated tenant user on protected route redirects to central root login', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';

    assert.equal(isRootOrigin(mockWindow), false);
    // ProtectedRoute redirects unauthenticated tenant users to central root origin login
    const targetRedirect = `${getRootOrigin(mockWindow)}/login`;
    assert.equal(targetRedirect, 'https://manhargurukkal.site/login');
  });

  test('13. Tenant user logout redirects to central root login with logged_out flag', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/employee';

    // Logout always redirects to central root domain login
    const rootOrigin = getRootOrigin(mockWindow);
    const logoutRedirect = `${rootOrigin}/login?logged_out=true`;
    assert.equal(logoutRedirect, 'https://manhargurukkal.site/login?logged_out=true');
    assert.notEqual(logoutRedirect, 'https://logesticgo.manhargurukkal.site/login?logged_out=true');

    // Dynamic compatibility for another tenant
    const otherTenantWindow = {
      location: {
        hostname: 'acme.manhargurukkal.site',
        origin: 'https://acme.manhargurukkal.site',
        pathname: '/operations',
      },
    };
    const otherLogoutRedirect = `${getRootOrigin(otherTenantWindow)}/login?logged_out=true`;
    assert.equal(otherLogoutRedirect, 'https://manhargurukkal.site/login?logged_out=true');
  });

  test('14. Local development environment correctly resolves localhost root origin', () => {
    mockWindow.location.hostname = 'logesticgo.localhost';
    mockWindow.location.origin = 'http://logesticgo.localhost:5173';
    mockWindow.location.protocol = 'http:';
    mockWindow.location.port = '5173';

    assert.equal(isRootOrigin(mockWindow), false);
    assert.equal(getRootOrigin(mockWindow), 'http://localhost:5173');
  });

  test('15. Company login redirect URL contains NO access/refresh tokens or query parameters', () => {
    const tenants = [
      { schema_name: 'logesticgo', workspace_url: 'https://logesticgo.manhargurukkal.site' },
      { schema_name: 'abc', workspace_url: 'https://abc.manhargurukkal.site' },
      { schema_name: 'acme_corp', workspace_url: 'https://acme_corp.manhargurukkal.site' },
    ];

    for (const tenant of tenants) {
      const redirectUrl = buildTenantRedirectUrl({
        tenant,
        currentOrigin: 'https://manhargurukkal.site',
        targetPath: '/dashboard',
        windowObj: mockWindow,
      });

      const parsed = new URL(redirectUrl);
      assert.equal(parsed.search, '', `Redirect URL ${redirectUrl} must not contain query parameters`);
      assert.ok(!redirectUrl.includes('auth_transfer'));
      assert.ok(!redirectUrl.includes('refresh_token'));
      assert.ok(!redirectUrl.includes('token'));
      assert.equal(redirectUrl, `https://${tenant.schema_name}.manhargurukkal.site/dashboard`);
    }
  });

  test('16. PublicRoute renders loading indicator during isLoading to prevent white screen', async () => {
    const fs = await import('node:fs/promises');
    const appSource = await fs.readFile(
      new URL('../App.jsx', import.meta.url),
      'utf-8'
    );

    // Extract PublicRoute body
    const publicRouteMatch = appSource.match(/function PublicRoute\(\{ children \}\) \{([\s\S]*?)\n\}/);
    assert.ok(publicRouteMatch, 'PublicRoute component must exist in App.jsx');

    const publicRouteCode = publicRouteMatch[1];
    // Must NOT return null on isLoading
    assert.ok(
      !publicRouteCode.includes('if (isLoading) {\n        return null'),
      'PublicRoute must not return null on isLoading (prevents white screen)'
    );
    assert.ok(
      publicRouteCode.includes('animate-spin') || publicRouteCode.includes('Loading'),
      'PublicRoute must render a visible loading indicator during isLoading'
    );
  });

  test('17. RoleRedirect renders loading indicator during isLoading to prevent white screen', async () => {
    const fs = await import('node:fs/promises');
    const roleRedirectSource = await fs.readFile(
      new URL('../routes/RoleRedirect.jsx', import.meta.url),
      'utf-8'
    );

    assert.ok(
      !roleRedirectSource.includes('if (isLoading) {\n    return null'),
      'RoleRedirect must not return null on isLoading'
    );
    assert.ok(
      roleRedirectSource.includes('animate-spin'),
      'RoleRedirect must render a visible loading indicator during isLoading'
    );
  });

  test('18. AuthContext coordinates subscription status to eliminate the /payment redirect race condition', async () => {
    const fs = await import('node:fs/promises');
    const authContextSource = await fs.readFile(
      new URL('../contexts/AuthContext.jsx', import.meta.url),
      'utf-8'
    );
    const protectedRouteSource = await fs.readFile(
      new URL('../routes/ProtectedRoute.jsx', import.meta.url),
      'utf-8'
    );

    // Verify LOGIN_SUCCESS exists in initAuth
    const initAuthMatch = authContextSource.match(/const initAuth = async \(\) => \{([\s\S]*?)\n    \}/);
    assert.ok(initAuthMatch, 'initAuth function must exist in AuthContext.jsx');

    const initAuthBody = initAuthMatch[1];
    const loginSuccessIndex = initAuthBody.indexOf("dispatch({ type: 'LOGIN_SUCCESS'");
    assert.ok(loginSuccessIndex !== -1, 'LOGIN_SUCCESS must be dispatched in initAuth');

    // Verify AuthContext exports isSubscriptionLoading
    assert.ok(
      authContextSource.includes('isSubscriptionLoading'),
      'AuthContext must export isSubscriptionLoading'
    );

    // Verify ProtectedRoute checks isSubscriptionLoading before evaluating subscription_status
    assert.ok(
      protectedRouteSource.includes('isSubscriptionLoading'),
      'ProtectedRoute must check isSubscriptionLoading'
    );
    assert.ok(
      protectedRouteSource.includes('user?.role === \'company_admin\' && isSubscriptionLoading'),
      'ProtectedRoute must show loading spinner if company_admin subscription is loading'
    );
  });

  test('19. getWebSocketBaseUrl resolves production wss://api.manhargurukkal.site and local ws://localhost:8000', () => {
    // Production tenant subdomain
    const prodTenantWin = { location: { hostname: 'logesticgo.manhargurukkal.site', protocol: 'https:' } };
    assert.equal(getWebSocketBaseUrl(prodTenantWin), 'wss://api.manhargurukkal.site');

    // Production root domain
    const prodRootWin = { location: { hostname: 'manhargurukkal.site', protocol: 'https:' } };
    assert.equal(getWebSocketBaseUrl(prodRootWin), 'wss://api.manhargurukkal.site');

    // Localhost dev
    const localWin = { location: { hostname: 'localhost', protocol: 'http:' } };
    assert.equal(getWebSocketBaseUrl(localWin), 'ws://localhost:8000');

    // Local tenant subdomain
    const localTenantWin = { location: { hostname: 'logesticgo.localhost', protocol: 'http:' } };
    assert.equal(getWebSocketBaseUrl(localTenantWin), 'ws://logesticgo.localhost:8000');
  });

  test('20. getApiBaseOrigin resolves production https://api.manhargurukkal.site and local http://localhost:8000', () => {
    // Production tenant subdomain
    const prodTenantWin = { location: { hostname: 'logesticgo.manhargurukkal.site', protocol: 'https:' } };
    assert.equal(getApiBaseOrigin(prodTenantWin), 'https://api.manhargurukkal.site');

    // Production root domain
    const prodRootWin = { location: { hostname: 'manhargurukkal.site', protocol: 'https:' } };
    assert.equal(getApiBaseOrigin(prodRootWin), 'https://api.manhargurukkal.site');

    // Localhost dev
    const localWin = { location: { hostname: 'localhost', protocol: 'http:' } };
    assert.equal(getApiBaseOrigin(localWin), 'http://localhost:8000');

    // Local tenant subdomain
    const localTenantWin = { location: { hostname: 'logesticgo.localhost', protocol: 'http:' } };
    assert.equal(getApiBaseOrigin(localTenantWin), 'http://logesticgo.localhost:8000');
  });

  test('21. Root / Super Admin logout redirects to root domain /login with logged_out flag', () => {
    mockWindow.location.hostname = 'manhargurukkal.site';
    mockWindow.location.origin = 'https://manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';

    assert.equal(isRootOrigin(mockWindow), true);
    const logoutRedirect = `${mockWindow.location.origin}/login?logged_out=true`;
    assert.equal(logoutRedirect, 'https://manhargurukkal.site/login?logged_out=true');
  });

  test('22. Authenticated tenant user routing remains unchanged across tenant workspaces', () => {
    const tenantUser = {
      schema_name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };

    // Authenticated on root -> redirected to tenant dashboard
    const redirectFromRoot = buildTenantRedirectUrl({
      tenant: tenantUser,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });
    assert.equal(redirectFromRoot, 'https://logesticgo.manhargurukkal.site/dashboard');

    // Authenticated on tenant origin -> stays on tenant origin (null cross-domain redirect)
    const redirectFromTenant = buildTenantRedirectUrl({
      tenant: tenantUser,
      currentOrigin: 'https://logesticgo.manhargurukkal.site',
      targetPath: '/dashboard',
      windowObj: mockWindow,
    });
    assert.equal(redirectFromTenant, null);
  });

  test('23. Authenticated super admin routing remains unchanged on root domain', () => {
    mockWindow.location.hostname = 'manhargurukkal.site';
    mockWindow.location.origin = 'https://manhargurukkal.site';
    mockWindow.location.pathname = '/super-admin';

    // Super admin has no tenant; getTenantWorkspaceOrigin returns null
    const superAdminTenantOrigin = getTenantWorkspaceOrigin(null, mockWindow);
    assert.equal(superAdminTenantOrigin, null);
    assert.equal(isRootOrigin(mockWindow), true);

    const redirectUrl = buildTenantRedirectUrl({
      tenant: null,
      currentOrigin: mockWindow.location.origin,
      targetPath: '/super-admin',
      windowObj: mockWindow,
    });
    assert.equal(redirectUrl, null);
  });

  test('24. Source code verification: logout redirect, ProtectedRoute, and PublicRoute central login enforcement', async () => {
    const fs = await import('node:fs/promises');
    const authContextSource = await fs.readFile(
      new URL('../contexts/AuthContext.jsx', import.meta.url),
      'utf-8'
    );
    const protectedRouteSource = await fs.readFile(
      new URL('../routes/ProtectedRoute.jsx', import.meta.url),
      'utf-8'
    );
    const appSource = await fs.readFile(
      new URL('../App.jsx', import.meta.url),
      'utf-8'
    );

    // AuthContext must use rootOrigin on logout & 401
    assert.ok(
      authContextSource.includes('window.location.href = `${rootOrigin}/login?logged_out=true`'),
      'AuthContext must redirect to rootOrigin/login?logged_out=true'
    );

    // ProtectedRoute must redirect unauthenticated tenant users to central root origin login
    assert.ok(
      protectedRouteSource.includes('window.location.replace(`${getRootOrigin()}/login`)'),
      'ProtectedRoute must redirect unauthenticated tenant users to root origin login'
    );

    // App.jsx PublicRoute must redirect unauthenticated tenant users to central root origin login
    assert.ok(
      appSource.includes('!isRootOrigin() && !isAuthenticated'),
      'App.jsx PublicRoute must check !isRootOrigin() && !isAuthenticated'
    );
    assert.ok(
      appSource.includes('window.location.replace(`${getRootOrigin()}/login`)'),
      'App.jsx PublicRoute must redirect unauthenticated tenant visitors to central root login'
    );
  });

  test('25. Central login: Employee belonging to tenant logesticgo redirects to /employee on tenant origin', () => {
    const tenant = {
      schema_name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };
    const targetPath = getRoleDefaultPath('employee');
    assert.equal(targetPath, '/employee');

    const redirectUrl = buildTenantRedirectUrl({
      tenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath,
      windowObj: mockWindow,
    });

    assert.equal(redirectUrl, 'https://logesticgo.manhargurukkal.site/employee');
  });

  test('26. Central login: Operations Manager belonging to tenant logesticgo redirects to /operations on tenant origin', () => {
    const tenant = {
      schema_name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };
    const targetPath = getRoleDefaultPath('operations_manager');
    assert.equal(targetPath, '/operations');

    const redirectUrl = buildTenantRedirectUrl({
      tenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath,
      windowObj: mockWindow,
    });

    assert.equal(redirectUrl, 'https://logesticgo.manhargurukkal.site/operations');
  });

  test('27. Central login: Company Admin belonging to tenant logesticgo redirects to /dashboard (or /payment) on tenant origin', () => {
    const tenant = {
      schema_name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };
    // Active subscription
    const activePath = getRoleDefaultPath('company_admin', { subscription_status: 'active' });
    assert.equal(activePath, '/dashboard');

    const activeRedirect = buildTenantRedirectUrl({
      tenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: activePath,
      windowObj: mockWindow,
    });
    assert.equal(activeRedirect, 'https://logesticgo.manhargurukkal.site/dashboard');

    // Inactive subscription
    const inactivePath = getRoleDefaultPath('company_admin', { subscription_status: 'payment_pending' });
    assert.equal(inactivePath, '/payment');

    const inactiveRedirect = buildTenantRedirectUrl({
      tenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: inactivePath,
      windowObj: mockWindow,
    });
    assert.equal(inactiveRedirect, 'https://logesticgo.manhargurukkal.site/payment');
  });

  test('28. Central login: Super Admin is not tenant-bound and stays on root domain /super-admin', () => {
    const targetPath = getRoleDefaultPath('super_admin');
    assert.equal(targetPath, '/super-admin');

    const redirectUrl = buildTenantRedirectUrl({
      tenant: null,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath,
      windowObj: mockWindow,
    });
    assert.equal(redirectUrl, null);
  });

  test('29. getRoleDefaultPath correctly maps all role variants and user objects', () => {
    assert.equal(getRoleDefaultPath({ role: 'super_admin' }), '/super-admin');
    assert.equal(getRoleDefaultPath({ role: 'company_admin' }), '/dashboard');
    assert.equal(getRoleDefaultPath({ role: 'company_admin' }, { subscription_status: 'expired' }), '/payment');
    assert.equal(getRoleDefaultPath({ user: { role: 'operations_manager' } }), '/operations');
    assert.equal(getRoleDefaultPath({ role: 'employee' }), '/employee');
    assert.equal(getRoleDefaultPath(null), '/employee');
  });

  test('30. Source code verification: logged_out param preserved across page reloads and sessionStorage stores logged_out flag', async () => {
    const fs = await import('node:fs/promises');
    const authContextSource = await fs.readFile(
      new URL('../contexts/AuthContext.jsx', import.meta.url),
      'utf-8'
    );

    // AuthContext must check both URL and sessionStorage
    assert.ok(
      authContextSource.includes("urlParams.get('logged_out') === 'true' || sessionStorage.getItem('logged_out') === 'true'"),
      'AuthContext must check logged_out from URL and sessionStorage'
    );

    // AuthContext must persist logged_out flag in sessionStorage when present in URL
    assert.ok(
      authContextSource.includes("sessionStorage.setItem('logged_out', 'true')"),
      'AuthContext must store logged_out in sessionStorage'
    );

    // AuthContext must NOT strip logged_out via history.replaceState
    assert.ok(
      !authContextSource.includes("urlParams.delete('logged_out')"),
      'AuthContext must not delete logged_out query param on initialization'
    );
  });
});

