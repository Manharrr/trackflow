import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authContextPath = path.resolve(__dirname, '../contexts/AuthContext.jsx');

describe('Auth Reducer & State Regression Suite', () => {
  test('1. AuthContext.jsx defines initialState and authReducer before useReducer call', () => {
    const content = fs.readFileSync(authContextPath, 'utf8');

    assert.match(content, /(?:const|export const)\s+initialState\s*=\s*\{/, 'initialState must be defined');
    assert.match(content, /(?:function|export function)\s+authReducer\s*\(\s*state\s*,\s*action\s*\)/, 'authReducer must be defined');
    assert.match(content, /useReducer\s*\(\s*authReducer\s*,\s*initialState\s*\)/, 'useReducer must reference defined authReducer and initialState');

    const initIdx = content.indexOf('initialState');
    const reducerIdx = content.indexOf('authReducer');
    const useReducerIdx = content.indexOf('useReducer(authReducer, initialState)');

    assert.ok(initIdx < useReducerIdx, 'initialState must be declared before useReducer');
    assert.ok(reducerIdx < useReducerIdx, 'authReducer must be declared before useReducer');
  });

  test('2. authReducer correctly handles LOGIN_SUCCESS, LOGOUT, and SET_LOADING transitions', () => {
    const content = fs.readFileSync(authContextPath, 'utf8');
    const fnMatch = content.match(/function\s+authReducer\s*\([\s\S]*?\n\}/);
    assert.ok(fnMatch, 'authReducer function implementation must exist');

    const authReducer = new Function('return ' + fnMatch[0])();

    const initial = { user: null, isAuthenticated: false, isLoading: true };

    // LOGIN_SUCCESS
    const userPayload = { id: 1, email: 'user@example.com', role: 'company_admin' };
    const loggedIn = authReducer(initial, { type: 'LOGIN_SUCCESS', payload: userPayload });
    assert.deepEqual(loggedIn, {
      user: userPayload,
      isAuthenticated: true,
      isLoading: false,
    });

    // SET_LOADING
    const loadingState = authReducer(loggedIn, { type: 'SET_LOADING', payload: true });
    assert.equal(loadingState.isLoading, true);

    // LOGOUT
    const loggedOut = authReducer(loggedIn, { type: 'LOGOUT' });
    assert.deepEqual(loggedOut, {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Unknown action returns current state
    const unchanged = authReducer(loggedIn, { type: 'UNKNOWN_ACTION' });
    assert.deepEqual(unchanged, loggedIn);
  });

  test('3. Built bundle does not leak unresolved bare identifiers for authReducer or initialState', () => {
    const distAssetsDir = path.resolve(__dirname, '../../dist/assets');
    if (!fs.existsSync(distAssetsDir)) {
      return;
    }
    const jsFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js') && f.startsWith('index-'));
    assert.ok(jsFiles.length > 0, 'Production JS bundle file should exist');

    for (const jsFile of jsFiles) {
      const bundleContent = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf8');
      assert.equal(
        bundleContent.includes('authReducer'),
        false,
        `Bundle ${jsFile} should not contain unresolved bare identifier authReducer`
      );
      assert.equal(
        bundleContent.includes('initialState'),
        false,
        `Bundle ${jsFile} should not contain unresolved bare identifier initialState`
      );
    }
  });
});
