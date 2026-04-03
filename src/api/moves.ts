import { apiRequest } from './client';

import type { ChecklistItem, MovePlan } from '@/types/api';

export const fetchMoves = (): Promise<MovePlan[]> => apiRequest('/api/mobile/moves');

export const createMove = (data: {
  title: string;
  from_city?: string;
  to_city?: string;
  checklist?: string[];
}): Promise<MovePlan> =>
  apiRequest('/api/mobile/moves', { method: 'POST', body: JSON.stringify(data) });

export const patchMoveStage = (moveId: number, stage: MovePlan['stage']): Promise<MovePlan> =>
  apiRequest(`/api/mobile/moves/${moveId}`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });

export const deleteMove = (moveId: number): Promise<void> =>
  apiRequest(`/api/mobile/moves/${moveId}`, { method: 'DELETE' });

export const toggleChecklistItem = (moveId: number, itemId: number): Promise<ChecklistItem> =>
  apiRequest(`/api/mobile/moves/${moveId}/items/${itemId}`, { method: 'PATCH' });
