import { apiRequest } from './client';

import type { Profile } from '@/types/api';

export const fetchProfile = (): Promise<Profile> => apiRequest('/api/mobile/profile');
