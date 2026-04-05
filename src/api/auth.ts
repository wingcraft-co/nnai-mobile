import { apiRequest } from './client';

import type { User } from '@/types/api';

type MobileOAuthMeta = {
  clientId?: string;
  platform?: 'ios' | 'android' | 'web';
};

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  meta: MobileOAuthMeta = {},
): Promise<{ token: string; user: User }> {
  const payload: Record<string, string> = {
    code,
    redirect_uri: redirectUri,
  };
  if (meta.clientId) {
    payload.client_id = meta.clientId;
  }
  if (meta.platform) {
    payload.platform = meta.platform;
  }

  return apiRequest('/auth/mobile/token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(): Promise<User> {
  return apiRequest('/auth/mobile/me');
}
