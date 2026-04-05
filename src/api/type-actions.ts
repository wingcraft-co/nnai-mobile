import { apiRequest } from './client';

import type {
  FreeSpiritSpin,
  LocalEventRec,
  PlannerBoard,
  PlannerTask,
  PioneerMilestone,
  WandererHop,
  WandererHopCondition,
} from '@/types/api';

export const fetchPlannerBoards = (): Promise<PlannerBoard[]> =>
  apiRequest('/api/mobile/type-actions/planner/boards');

export const createPlannerBoard = (data: {
  country: string;
  city?: string | null;
  title: string;
}): Promise<PlannerBoard> =>
  apiRequest('/api/mobile/type-actions/planner/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const createPlannerTask = (
  boardId: number,
  data: { text: string; due_date?: string | null; sort_order?: number },
): Promise<PlannerTask> =>
  apiRequest(`/api/mobile/type-actions/planner/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const patchPlannerTask = (
  taskId: number,
  data: { is_done?: boolean; text?: string; due_date?: string | null },
): Promise<PlannerTask> =>
  apiRequest(`/api/mobile/type-actions/planner/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const spinFreeSpirit = (data: {
  country?: string;
  city?: string;
  lat: number;
  lng: number;
  radius_m?: number;
  keyword?: string;
}): Promise<FreeSpiritSpin> =>
  apiRequest('/api/mobile/type-actions/free-spirit/spins', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const fetchWandererHops = (): Promise<WandererHop[]> =>
  apiRequest('/api/mobile/type-actions/wanderer/hops');

export const createWandererHop = (data: {
  to_country: string;
  to_city?: string | null;
  from_country?: string | null;
  target_month?: string | null;
  note?: string | null;
  status?: 'planned' | 'booked';
  conditions?: WandererHopCondition[];
  is_focus?: boolean;
}): Promise<WandererHop> =>
  apiRequest('/api/mobile/type-actions/wanderer/hops', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const patchWandererHop = (
  hopId: number,
  data: Partial<Pick<WandererHop, 'status' | 'to_country' | 'to_city' | 'target_month' | 'note' | 'conditions' | 'is_focus'>>,
): Promise<WandererHop> =>
  apiRequest(`/api/mobile/type-actions/wanderer/hops/${hopId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteWandererHop = (hopId: number): Promise<void> =>
  apiRequest(`/api/mobile/type-actions/wanderer/hops/${hopId}`, { method: 'DELETE' });

export const fetchLocalEventsSaved = (): Promise<LocalEventRec[]> =>
  apiRequest('/api/mobile/type-actions/local/events/saved');

export const saveLocalEvent = (
  data: Omit<LocalEventRec, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: LocalEventRec['status'] },
): Promise<{ id: number; status: LocalEventRec['status'] }> =>
  apiRequest('/api/mobile/type-actions/local/events/save', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const patchLocalEvent = (
  eventId: number,
  data: { status: LocalEventRec['status'] },
): Promise<{ id: number; status: LocalEventRec['status'] }> =>
  apiRequest(`/api/mobile/type-actions/local/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const fetchPioneerMilestones = (): Promise<PioneerMilestone[]> =>
  apiRequest('/api/mobile/type-actions/pioneer/milestones');

export const patchPioneerMilestone = (
  milestoneId: number,
  data: Partial<Pick<PioneerMilestone, 'status' | 'title' | 'target_date' | 'note'>>,
): Promise<PioneerMilestone> =>
  apiRequest(`/api/mobile/type-actions/pioneer/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
