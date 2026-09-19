import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  REFRESH_TOKEN_KEY,
  getStoredRefreshToken,
  setStoredRefreshToken,
  getStoredAccessToken,
  setStoredAccessToken,
  clearStoredTokens,
  createTokenRefresher,
  setLoggingOut,
  isLoggingOut,
} from '../services/authSession.js';

describe('Auth Session & Token Refresh Regression Suite', () => {
  let mockAxios;
  let postCalls;
  let logoutTriggered;

  beforeEach(() => {
    postCalls = [];
    logoutTriggered = false;
    setLoggingOut(false);

    // Mock storage if in Node environment
    globalThis.localStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    };
    globalThis.sessionStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; }
    };

    mockAxios = {
      defaults: {
        headers: {
          common: {},
        },
      },
      post: async (url, data) => {
        postCalls.push({ url, data });
        return {
          data: {
            access: 'new_access_token_xyz',
            refresh: 'new_rotated_refresh_xyz',
          },
        };
      },
    };

    clearStoredTokens(mockAxios);
  });

  test('1. Login stores access + refresh correctly', () => {
    setStoredAccessToken('access_token_123', mockAxios);
    setStoredRefreshToken('refresh_token_456');

    assert.equal(getStoredAccessToken(), 'access_token_123');
    assert.equal(getStoredRefreshToken(), 'refresh_token_456');
    assert.equal(
      mockAxios.defaults.headers.common['Authorization'],
      'Bearer access_token_123'
    );
    assert.equal(localStorage.getItem(REFRESH_TOKEN_KEY), 'refresh_token_456');
  });

  test('2. Refresh sends the stored refresh token', async () => {
    setStoredRefreshToken('stored_refresh_token_789');

    const refresher = createTokenRefresher({
      axiosClient: mockAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    const newAccess = await refresher.refresh();

    assert.equal(newAccess, 'new_access_token_xyz');
    assert.equal(postCalls.length, 1);
    assert.equal(postCalls[0].url, '/auth/token/refresh/');
    assert.deepEqual(postCalls[0].data, { refresh: 'stored_refresh_token_789' });
    assert.equal(logoutTriggered, false);
  });

  test('3. No refresh request is made when refresh token is absent', async () => {
    clearStoredTokens(mockAxios);
    assert.equal(getStoredRefreshToken(), null);

    const refresher = createTokenRefresher({
      axiosClient: mockAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    await assert.rejects(
      async () => {
        await refresher.refresh();
      },
      {
        name: 'Error',
        message: 'No refresh token available',
      }
    );

    // CRITICAL: Zero HTTP requests sent when refresh token is absent
    assert.equal(postCalls.length, 0);
    assert.equal(logoutTriggered, true);
  });

  test('4. Logout does not trigger an empty refresh request', async () => {
    setStoredRefreshToken('some_refresh_token');
    setLoggingOut(true);

    const refresher = createTokenRefresher({
      axiosClient: mockAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    await assert.rejects(
      async () => {
        await refresher.refresh();
      },
      {
        name: 'Error',
        message: 'Logout in progress',
      }
    );

    assert.equal(postCalls.length, 0);
  });

  test('5. Multiple 401s do not create uncontrolled concurrent refresh requests', async () => {
    setStoredRefreshToken('stored_refresh_token_multi');

    let resolveServerCall;
    const delayedAxios = {
      defaults: { headers: { common: {} } },
      post: async (url, data) => {
        postCalls.push({ url, data });
        return new Promise((resolve) => {
          resolveServerCall = () => resolve({
            data: {
              access: 'deduped_access_token',
              refresh: 'deduped_refresh_token',
            },
          });
        });
      },
    };

    const refresher = createTokenRefresher({
      axiosClient: delayedAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    // Simulate 5 simultaneous requests getting 401 and calling refresh concurrently
    const p1 = refresher.refresh();
    const p2 = refresher.refresh();
    const p3 = refresher.refresh();
    const p4 = refresher.refresh();
    const p5 = refresher.refresh();

    // Resolve the single underlying server request
    resolveServerCall();

    const results = await Promise.all([p1, p2, p3, p4, p5]);

    // All 5 received the same new access token
    for (const res of results) {
      assert.equal(res, 'deduped_access_token');
    }

    // Only ONE refresh network request was made!
    assert.equal(postCalls.length, 1);
  });

  test('6. Failed refresh clears authentication correctly', async () => {
    setStoredAccessToken('old_access_token', mockAxios);
    setStoredRefreshToken('expired_refresh_token');

    const failingAxios = {
      defaults: { headers: { common: { Authorization: 'Bearer old_access_token' } } },
      post: async () => {
        const error = new Error('Invalid or expired refresh token.');
        error.response = { status: 401, data: { error: 'Invalid or expired refresh token.' } };
        throw error;
      },
    };

    const refresher = createTokenRefresher({
      axiosClient: failingAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    await assert.rejects(async () => {
      await refresher.refresh();
    });

    assert.equal(getStoredAccessToken(), null);
    assert.equal(getStoredRefreshToken(), null);
    assert.equal(failingAxios.defaults.headers.common['Authorization'], undefined);
    assert.equal(logoutTriggered, true);
  });

  test('7. Successful refresh updates the access token correctly', async () => {
    setStoredAccessToken('old_access_token', mockAxios);
    setStoredRefreshToken('initial_refresh_token');

    const refresher = createTokenRefresher({
      axiosClient: mockAxios,
      onLogout: () => { logoutTriggered = true; },
    });

    const newAccess = await refresher.refresh();

    assert.equal(newAccess, 'new_access_token_xyz');
    assert.equal(getStoredAccessToken(), 'new_access_token_xyz');
    assert.equal(getStoredRefreshToken(), 'new_rotated_refresh_xyz');
    assert.equal(
      mockAxios.defaults.headers.common['Authorization'],
      'Bearer new_access_token_xyz'
    );
  });
});
