import type { QuestEventName } from '@/types/quest';

type QuestAnalyticsEvent = {
  name: QuestEventName;
  quest_id: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

const questEventBuffer: QuestAnalyticsEvent[] = [];
export type NomadOpsEventName =
  | 'timeline_viewed'
  | 'must_leave_computed'
  | 'move_draft_created'
  | 'constraint_error_shown'
  | 'move_draft_confirmed'
  | 'critical_alert_opened';

type NomadOpsAnalyticsEvent = {
  name: NomadOpsEventName;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

const nomadOpsEventBuffer: NomadOpsAnalyticsEvent[] = [];

export function trackQuestEvent(event: QuestAnalyticsEvent): void {
  questEventBuffer.push(event);

  // Temporary local sink until backend analytics endpoint is wired.
  if (__DEV__) {
    console.info('[quest-event]', event);
  }
}

export function getQuestEventBuffer(): QuestAnalyticsEvent[] {
  return [...questEventBuffer];
}

export function clearQuestEventBuffer(): void {
  questEventBuffer.length = 0;
}

export function trackNomadOpsEvent(name: NomadOpsEventName, metadata?: Record<string, unknown>): void {
  const event: NomadOpsAnalyticsEvent = {
    name,
    occurred_at: new Date().toISOString(),
    metadata,
  };
  nomadOpsEventBuffer.push(event);
  if (__DEV__) {
    console.info('[nomad-ops-event]', event);
  }
}

export function getNomadOpsEventBuffer(): NomadOpsAnalyticsEvent[] {
  return [...nomadOpsEventBuffer];
}

export function clearNomadOpsEventBuffer(): void {
  nomadOpsEventBuffer.length = 0;
}
