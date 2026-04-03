import { apiRequest } from './client';

import type { Circle } from '@/types/api';

export const fetchCircles = (): Promise<Circle[]> => apiRequest('/api/mobile/circles');

export const toggleCircleMembership = (circleId: number): Promise<{ joined: boolean }> =>
  apiRequest(`/api/mobile/circles/${circleId}/join`, { method: 'POST' });
