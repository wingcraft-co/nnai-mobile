import type { QuestEventName } from '@/types/quest';

type QuestAnalyticsEvent = {
  name: QuestEventName;
  quest_id: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

const questEventBuffer: QuestAnalyticsEvent[] = [];

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
