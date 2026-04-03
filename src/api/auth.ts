import { apiRequest } from './client';

import type { User } from '@/types/api';

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ token: string; user: User }> {
  return apiRequest('/auth/mobile/token', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

export async function fetchMe(): Promise<User> {
  return apiRequest('/auth/mobile/me');
}
