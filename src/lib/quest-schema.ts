import type { ComboState, Quest, QuestEvent, QuestEventName, SaveRunState } from '@/types/quest';

type ParseSuccess<T> = {
  success: true;
  data: T;
};

type ParseFailure = {
  success: false;
  errors: string[];
};

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

const QUEST_EVENT_NAMES: QuestEventName[] = [
  'quest_created',
  'proof_submitted',
  'proof_rejected',
  'quest_completed',
  'quest_failed',
  'save_run_used',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function isTimezone(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function fail<T>(...errors: string[]): ParseResult<T> {
  return { success: false, errors };
}

export function parseQuest(input: unknown): ParseResult<Quest> {
  if (!isRecord(input)) return fail('quest must be an object');

  const errors: string[] = [];

  if (!isNonEmptyString(input.id)) errors.push('quest.id must be a non-empty string');
  if (!isNonEmptyString(input.title)) errors.push('quest.title must be a non-empty string');
  if (!isTimezone(input.timezone)) errors.push('quest.timezone must be a valid IANA timezone');
  if (!isIsoDateString(input.created_at)) errors.push('quest.created_at must be an ISO date string');
  if (!isIsoDateString(input.deadline_at)) errors.push('quest.deadline_at must be an ISO date string');

  if (
    input.status !== 'active' &&
    input.status !== 'completed' &&
    input.status !== 'failed'
  ) {
    errors.push("quest.status must be one of 'active' | 'completed' | 'failed'");
  }

  if (input.proof_kind !== 'github_pr') {
    errors.push("quest.proof_kind must be 'github_pr'");
  }

  if (input.proof_url !== null && !isNonEmptyString(input.proof_url)) {
    errors.push('quest.proof_url must be null or a non-empty string');
  }

  if (input.completed_at !== null && !isIsoDateString(input.completed_at)) {
    errors.push('quest.completed_at must be null or an ISO date string');
  }

  if (input.failed_at !== null && !isIsoDateString(input.failed_at)) {
    errors.push('quest.failed_at must be null or an ISO date string');
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: input as Quest };
}

export function parseComboState(input: unknown): ParseResult<ComboState> {
  if (!isRecord(input)) return fail('combo_state must be an object');

  const errors: string[] = [];

  if (typeof input.streak_current !== 'number' || input.streak_current < 0) {
    errors.push('combo_state.streak_current must be a non-negative number');
  }
  if (typeof input.streak_best !== 'number' || input.streak_best < 0) {
    errors.push('combo_state.streak_best must be a non-negative number');
  }
  if (
    input.last_completed_at !== null &&
    !isIsoDateString(input.last_completed_at)
  ) {
    errors.push('combo_state.last_completed_at must be null or an ISO date string');
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: input as ComboState };
}

export function parseSaveRunState(input: unknown): ParseResult<SaveRunState> {
  if (!isRecord(input)) return fail('save_run_state must be an object');

  const errors: string[] = [];

  if (typeof input.weekly_limit !== 'number' || input.weekly_limit < 0) {
    errors.push('save_run_state.weekly_limit must be a non-negative number');
  }
  if (!Array.isArray(input.used_week_keys) || !input.used_week_keys.every(isNonEmptyString)) {
    errors.push('save_run_state.used_week_keys must be an array of non-empty strings');
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: input as SaveRunState };
}

export function parseQuestEvent(input: unknown): ParseResult<QuestEvent> {
  if (!isRecord(input)) return fail('quest_event must be an object');

  const errors: string[] = [];

  if (!QUEST_EVENT_NAMES.includes(input.name as QuestEventName)) {
    errors.push('quest_event.name must be a known event name');
  }
  if (!isNonEmptyString(input.quest_id)) {
    errors.push('quest_event.quest_id must be a non-empty string');
  }
  if (!isIsoDateString(input.occurred_at)) {
    errors.push('quest_event.occurred_at must be an ISO date string');
  }
  if (input.metadata !== undefined && !isRecord(input.metadata)) {
    errors.push('quest_event.metadata must be an object when provided');
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: input as QuestEvent };
}

export function assertQuest(input: unknown): Quest {
  const result = parseQuest(input);
  if (!result.success) {
    throw new Error(`Invalid quest payload: ${result.errors.join(', ')}`);
  }
  return result.data;
}

export function assertComboState(input: unknown): ComboState {
  const result = parseComboState(input);
  if (!result.success) {
    throw new Error(`Invalid combo_state payload: ${result.errors.join(', ')}`);
  }
  return result.data;
}

export function assertSaveRunState(input: unknown): SaveRunState {
  const result = parseSaveRunState(input);
  if (!result.success) {
    throw new Error(`Invalid save_run_state payload: ${result.errors.join(', ')}`);
  }
  return result.data;
}

export function assertQuestEvent(input: unknown): QuestEvent {
  const result = parseQuestEvent(input);
  if (!result.success) {
    throw new Error(`Invalid quest_event payload: ${result.errors.join(', ')}`);
  }
  return result.data;
}

