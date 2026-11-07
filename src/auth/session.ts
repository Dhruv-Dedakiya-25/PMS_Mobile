/**
 * The live session for PMS_Mobile:
 *
 *   access token  -> memory only, renewed via /api/Auth/refresh.
 *   refresh token -> memory and expo-secure-store on native; HttpOnly cookie via /api proxy on web.
 *   user          -> AsyncStorage, updated from GET /api/Auth/me for currencyCode and displayName.
 *
 * Demo mode never uses this module.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { AuthUser, LoginResponse } from '@/api/types';
import { apiBaseUrl } from '@/config';
import { setCurrencyCode } from '@/lib/format';

const REFRESH_KEY = 'pms.refreshToken';
const USER_KEY = 'pms.user';
const TIMEOUT_MS = 20_000;

export type AuthState =
  | { status: 'starting' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AuthUser; notLinked?: boolean };

export class SignInError extends Error {
  constructor(
    public readonly reason: 'invalid' | 'noApi',
    message?: string,
  ) {
    super(message ?? reason);
    this.name = 'SignInError';
  }
}

let state: AuthState = { status: 'starting' };
let accessToken: string | null = null;
let refreshToken: string | null = null;
const listeners = new Set<() => void>();

const setState = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const useAuth = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const getAccessToken = () => accessToken;
export const getAuthState = () => state;

const secure = {
  get: (key: string) => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key).catch(() => null)),
  set: (key: string, value: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(key, value).catch(() => undefined),
  remove: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key).catch(() => undefined),
};

async function extractErrorMessage(res: Response): Promise<string | undefined> {
  const text = await res.text().catch(() => '');
  if (!text) return undefined;
  try {
    const body = JSON.parse(text);
    if (typeof body === 'string') return body;
    return body?.detail ?? body?.message ?? body?.title;
  } catch {
    return text;
  }
}

function cookieRefreshToken(res: Response): string | null {
  const header = res.headers.get('set-cookie');
  if (!header) return null;
  const match = header.match(/pms_rt=([^;,\s]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function postAuth(path: string, body?: unknown): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBaseUrl}/Auth/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status === 502 || res.status === 503 || res.status === 504) throw new SignInError('noApi');
    return res;
  } catch (e) {
    throw e instanceof SignInError ? e : new SignInError('noApi');
  } finally {
    clearTimeout(timer);
  }
}

/** Reads GET /api/Auth/me for the company currencyCode and display name. */
export async function fetchMe(token = accessToken): Promise<AuthUser | null> {
  if (!token) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBaseUrl}/Auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      signal: abort.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function keep(session: LoginResponse, rtFromHeader: string | null) {
  accessToken = session.accessToken;
  const nextRefresh = session.refreshToken || rtFromHeader || refreshToken;
  refreshToken = nextRefresh ?? null;
  if (refreshToken) await secure.set(REFRESH_KEY, refreshToken);

  const me = await fetchMe(session.accessToken);
  const user: AuthUser = me ? { ...session.user, ...me } : session.user;
  setCurrencyCode(user.currencyCode);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => undefined);
  const isTenant = String(user.userType) === 'Tenant';
  setState({ status: 'signedIn', user, notLinked: isTenant && !user.tenantId });
}

/** Ends the session on this device only. */
export async function signOutHere() {
  accessToken = null;
  refreshToken = null;
  setCurrencyCode('OMR');
  await secure.remove(REFRESH_KEY);
  await AsyncStorage.removeItem(USER_KEY).catch(() => undefined);
  setState({ status: 'signedOut' });
}

/** Marks the signed-in tenant account as not yet linked to a tenancy record (HTTP 403 from /api/My). */
export function markNotLinked() {
  if (state.status === 'signedIn' && String(state.user.userType) === 'Tenant' && !state.notLinked) {
    setState({ ...state, notLinked: true });
  }
}

/** Restores a saved session on startup. */
export async function restoreSession() {
  refreshToken = await secure.get(REFRESH_KEY);
  if (Platform.OS !== 'web' && !refreshToken) {
    setState({ status: 'signedOut' });
    return;
  }

  if (await refreshSession()) return;

  // Renewal could not run (server busy or rate-limited) but the session was not refused: stay
  // signed in as the saved user and renew on the next request. On the web the token is a cookie.
  const saved = await AsyncStorage.getItem(USER_KEY).catch(() => null);
  if ((refreshToken || Platform.OS === 'web') && saved) {
    const user = JSON.parse(saved) as AuthUser;
    setCurrencyCode(user.currencyCode);
    const isTenant = String(user.userType) === 'Tenant';
    setState({ status: 'signedIn', user, notLinked: isTenant && !user.tenantId });
  } else {
    setState({ status: 'signedOut' });
  }
}

/** Signs in with username and password. Supports all user roles. */
export async function login(username: string, password: string): Promise<void> {
  const res = await postAuth('login', { username: username.trim(), password, rememberMe: true });
  if (!res.ok) {
    // A wrong username or password is said in the app's language; anything else (a locked
    // account, say) is the server's own message.
    const msg = res.status === 401 ? undefined : await extractErrorMessage(res);
    throw new SignInError('invalid', msg);
  }

  const rtHeader = cookieRefreshToken(res);
  const body = (await res.json()) as LoginResponse;

  await keep(body, rtHeader);
}

let inFlight: Promise<boolean> | null = null;

/** Exchanges the refresh token (or web cookie) for a new access token. */
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    if (Platform.OS !== 'web' && !refreshToken) return false;
    try {
      const res = await postAuth('refresh', refreshToken ? { refreshToken } : {});
      if (!res.ok) {
        // Only a refused session ends here; a busy or rate-limited server (429) is tried again later.
        if (res.status === 400 || res.status === 401 || res.status === 403) await signOutHere();
        return false;
      }
      const rtHeader = cookieRefreshToken(res);
      const body = (await res.json()) as LoginResponse;
      await keep(body, rtHeader);
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Signs out and revokes the refresh token on the server (/api/Auth/logout). */
export async function logout() {
  const token = refreshToken;
  await signOutHere();
  await postAuth('logout', token ? { refreshToken: token } : {}).catch(() => undefined);
}
