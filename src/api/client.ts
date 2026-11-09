/**
 * Authenticated requests to PMS_API: attaches the access token on every request,
 * refreshes once on 401 before signing out, and surfaces the server's message on ApiError.
 */
import { getAccessToken, markNotLinked, refreshSession, signOutHere } from '@/auth/session';
import { apiBaseUrl } from '@/config';
import { Platform } from 'react-native';

import i18n from '@/i18n';

const TIMEOUT_MS = 30_000;
/** A photo on a slow mobile link takes longer than a JSON call. */
const UPLOAD_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly notLinked = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const noApi = () => new ApiError(0, i18n.t('common.errorLoad'));

async function messageFrom(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `${res.status} ${res.statusText}`;
  try {
    const body = JSON.parse(text);
    if (typeof body === 'string') return body;
    if (body.errors) {
      const messages = Object.values(body.errors as Record<string, string[]>)
        .map((m) => m?.[0])
        .filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    return body.detail ?? body.message ?? body.title ?? text;
  } catch {
    return text;
  }
}

async function send(method: string, path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const token = getAccessToken();
  // A FormData body (a photo upload) sets its own Content-Type with the boundary.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Accept-Language': i18n.language,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status === 502 || res.status === 503 || res.status === 504) throw noApi();
    return res;
  } catch (e) {
    if (__DEV__ && !(e instanceof ApiError)) console.warn(`${method} ${path} failed:`, e);
    throw e instanceof ApiError ? e : noApi();
  } finally {
    clearTimeout(timer);
  }
}

export async function sendAuthed(method: string, path: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<Response> {
  if (!getAccessToken()) await refreshSession();

  let res = await send(method, path, body, timeoutMs);
  if (res.status === 401) {
    const renewed = await refreshSession();
    if (renewed) res = await send(method, path, body, timeoutMs);
    // A refused session was already signed out by refreshSession. A renewal that could not run
    // (server busy or rate-limited) keeps the user signed in, and the screen offers Retry.
    if (res.status === 401) {
      if (renewed) await signOutHere();
      throw new ApiError(401, i18n.t('common.errorLoad'));
    }
  }
  if (!res.ok) {
    const msg = await messageFrom(res);
    const isNotLinked = res.status === 403 && /not linked/i.test(msg);
    if (isNotLinked) markNotLinked();
    throw new ApiError(res.status, msg, isNotLinked);
  }
  return res;
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  const res = await sendAuthed(method, path, body, timeoutMs);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiGet = <T>(path: string, timeoutMs?: number) => request<T>('GET', path, undefined, timeoutMs);

/** Reads a protected image as a data URI, which an Image can show on every platform. */
export async function apiImage(path: string): Promise<string> {
  const blob = await (await sendAuthed('GET', path)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Sends one JPEG photo as the "file" form field. On the web the uri is read into a Blob first. */
export async function apiUploadPhoto(path: string, uri: string): Promise<void> {
  const form = new FormData();
  if (Platform.OS === 'web') form.append('file', await (await fetch(uri)).blob(), 'photo.jpg');
  else form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  await sendAuthed('POST', path, form, UPLOAD_TIMEOUT_MS);
}
export const apiPost = <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('POST', path, body, timeoutMs);
export const apiPut = <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('PUT', path, body, timeoutMs);
export const apiDelete = <T>(path: string, timeoutMs?: number) => request<T>('DELETE', path, undefined, timeoutMs);
