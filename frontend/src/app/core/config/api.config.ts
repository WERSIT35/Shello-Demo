const REMOTE_API_ORIGIN = 'https://shello-demo-api.onrender.com';

function normalizeApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

function resolveApiBaseUrl(): string {
  const runtimeConfig = (globalThis as { __SHELLO_CONFIG__?: { apiBaseUrl?: string } }).__SHELLO_CONFIG__;
  const configuredUrl = runtimeConfig?.apiBaseUrl;

  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    return normalizeApiBase(configuredUrl);
  }

  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return '/api/v1';
    }
  }

  return normalizeApiBase(REMOTE_API_ORIGIN);
}

export const API_BASE_URL = resolveApiBaseUrl();
