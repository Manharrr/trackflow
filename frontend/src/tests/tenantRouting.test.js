import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTenantWorkspaceOrigin,
  getRootOrigin,
  isRootOrigin,
  buildTenantRedirectUrl,
  cleanAuthTransferFromUrl,
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

  test('1. Root login + logesticgo tenant dynamically redirects to logesticgo workspace', () => {
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
      refreshToken: backendResponse.refresh,
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://logesticgo.manhargurukkal.site/dashboard?auth_transfer=refresh_abc'
    );
    assert.notEqual(redirectUrl, 'https://manhargurukkal.site/dashboard');
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
      refreshToken: backendResponse.refresh,
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://abc.manhargurukkal.site/dashboard?auth_transfer=refresh_def'
    );
    assert.notEqual(redirectUrl, 'https://manhargurukkal.site/dashboard');
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
      refreshToken: 'tok_xyz',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://xyz.manhargurukkal.site/dashboard?auth_transfer=tok_xyz'
    );
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
        refreshToken: 'refresh_token_xyz',
        windowObj: mockWindow,
      });

      assert.ok(redirectUrl, 'Must return a cross-origin redirect URL');
      assert.ok(!redirectUrl.startsWith('https://manhargurukkal.site/dashboard'));
      assert.ok(redirectUrl.includes(`${tenant.schema_name}.manhargurukkal.site`));
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

  test('6. auth_transfer cleanup must not return the browser to root', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';
    mockWindow.location.search = '?auth_transfer=transferred_refresh_token_123';

    cleanAuthTransferFromUrl(mockWindow);

    assert.equal(mockWindow.history.replaceStateCalls.length, 1);
    assert.equal(mockWindow.history.replaceStateCalls[0].url, '/dashboard');
    assert.equal(mockWindow.location.pathname, '/dashboard');
    assert.equal(mockWindow.location.search, '');
    // Origin is completely preserved on tenant domain
    assert.equal(mockWindow.location.origin, 'https://logesticgo.manhargurukkal.site');
    assert.notEqual(mockWindow.location.origin, 'https://manhargurukkal.site');
  });

  test('7. MFA login must dynamically redirect using tenant.workspace_url', () => {
    const mfaTenant = {
      schema_name: 'logesticgo',
      name: 'logesticgo',
      workspace_url: 'https://logesticgo.manhargurukkal.site',
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: mfaTenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: '/dashboard',
      refreshToken: 'mfa_refresh_token_456',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://logesticgo.manhargurukkal.site/dashboard?auth_transfer=mfa_refresh_token_456'
    );
  });

  test('8. Google login must dynamically redirect using tenant.workspace_url', () => {
    const googleTenant = {
      schema_name: 'globalfleet',
      name: 'Global Fleet Inc',
      workspace_url: 'https://globalfleet.manhargurukkal.site',
    };

    const redirectUrl = buildTenantRedirectUrl({
      tenant: googleTenant,
      currentOrigin: 'https://manhargurukkal.site',
      targetPath: '/dashboard',
      refreshToken: 'google_refresh_token_789',
      windowObj: mockWindow,
    });

    assert.equal(
      redirectUrl,
      'https://globalfleet.manhargurukkal.site/dashboard?auth_transfer=google_refresh_token_789'
    );
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

  test('11. Unauthenticated request to tenant login redirects to root login', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/login';

    assert.equal(isRootOrigin(mockWindow), false);
    const rootLoginUrl = `${getRootOrigin(mockWindow)}/login`;
    assert.equal(rootLoginUrl, 'https://manhargurukkal.site/login');
  });

  test('12. Unauthenticated request on tenant protected route redirects to root login', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';

    assert.equal(isRootOrigin(mockWindow), false);
    const targetRedirect = isRootOrigin(mockWindow) ? '/login' : `${getRootOrigin(mockWindow)}/login`;
    assert.equal(targetRedirect, 'https://manhargurukkal.site/login');
  });

  test('13. Logout always returns the browser to root domain landing page', () => {
    mockWindow.location.hostname = 'logesticgo.manhargurukkal.site';
    mockWindow.location.origin = 'https://logesticgo.manhargurukkal.site';
    mockWindow.location.pathname = '/dashboard';

    const rootOrigin = getRootOrigin(mockWindow);
    const logoutRedirect = `${rootOrigin}/?logged_out=true`;
    assert.equal(logoutRedirect, 'https://manhargurukkal.site/?logged_out=true');
    assert.notEqual(logoutRedirect, 'https://logesticgo.manhargurukkal.site/?logged_out=true');
  });

  test('14. Local development environment correctly resolves localhost root origin', () => {
    mockWindow.location.hostname = 'logesticgo.localhost';
    mockWindow.location.origin = 'http://logesticgo.localhost:5173';
    mockWindow.location.protocol = 'http:';
    mockWindow.location.port = '5173';

    assert.equal(isRootOrigin(mockWindow), false);
    assert.equal(getRootOrigin(mockWindow), 'http://localhost:5173');
  });
});
