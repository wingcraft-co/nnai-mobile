import type { ComboState, Quest, SaveRunState } from '@/types/quest';

type QuestStatus = Quest['status'];

type CreateQuestInput = {
  id: string;
  title: string;
  timezone: string;
  created_at: string;
  deadline_at: string;
};

type SubmitProofInput = {
  quest: Quest;
  proof_url: string;
  submitted_at: string;
  server_now: string;
};

type DeadlineResultInput = {
  quest: Quest;
  server_now: string;
};

type SaveRunInput = {
  quest: Quest;
  save_run: SaveRunState;
  week_key: string;
  extended_deadline_at: string;
};

type ComboUpdateInput = {
  combo: ComboState;
  before_status: QuestStatus;
  after_status: QuestStatus;
  completed_at: string | null;
};

function isIsoDateString(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function assertIsoDateString(value: string, label: string): void {
  if (!isIsoDateString(value)) {
    throw new Error(`${label} must be an ISO date string`);
  }
}

function assertQuestActive(quest: Quest): void {
  if (quest.status !== 'active') {
    throw new Error('quest must be active');
  }
}

function withStatus(quest: Quest, status: QuestStatus): Quest {
  if (status === 'completed') {
    return {
      ...quest,
      status,
      failed_at: null,
    };
  }
  if (status === 'failed') {
    return {
      ...quest,
      status,
      completed_at: null,
    };
  }
  return quest;
}

export function createQuest(input: CreateQuestInput): Quest {
  if (!input.id.trim()) throw new Error('id is required');
  if (!input.title.trim()) throw new Error('title is required');
  if (!input.timezone.trim()) throw new Error('timezone is required');
  assertIsoDateString(input.created_at, 'created_at');
  assertIsoDateString(input.deadline_at, 'deadline_at');

  const created = Date.parse(input.created_at);
  const deadline = Date.parse(input.deadline_at);
  if (deadline <= created) {
    throw new Error('deadline_at must be after created_at');
  }

  return {
    id: input.id,
    title: input.title,
    timezone: input.timezone,
    created_at: input.created_at,
    deadline_at: input.deadline_at,
    status: 'active',
    proof_kind: 'github_pr',
    proof_url: null,
    completed_at: null,
    failed_at: null,
  };
}

export function submitProof(input: SubmitProofInput): Quest {
  const proofUrl = input.proof_url.trim();
  if (!proofUrl) throw new Error('proof_url is required');

  assertIsoDateString(input.submitted_at, 'submitted_at');
  assertIsoDateString(input.server_now, 'server_now');
  assertIsoDateString(input.quest.deadline_at, 'quest.deadline_at');

  assertQuestActive(input.quest);

  const now = Date.parse(input.server_now);
  const deadline = Date.parse(input.quest.deadline_at);
  if (now > deadline) {
    throw new Error('cannot submit proof after deadline');
  }

  return withStatus(
    {
      ...input.quest,
      proof_url: proofUrl,
      completed_at: input.submitted_at,
    },
    'completed',
  );
}

export function applyDeadlineResult(input: DeadlineResultInput): Quest {
  assertIsoDateString(input.server_now, 'server_now');
  assertIsoDateString(input.quest.deadline_at, 'quest.deadline_at');

  if (input.quest.status !== 'active') {
    return input.quest;
  }

  const now = Date.parse(input.server_now);
  const deadline = Date.parse(input.quest.deadline_at);
  if (now <= deadline) {
    return input.quest;
  }

  return withStatus(
    {
      ...input.quest,
      failed_at: input.server_now,
    },
    'failed',
  );
}

export function canUseSaveRun(save_run: SaveRunState, week_key: string): boolean {
  if (!week_key.trim()) throw new Error('week_key is required');
  if (save_run.weekly_limit <= 0) return false;

  const usedCount = save_run.used_week_keys.filter((key) => key === week_key).length;
  return usedCount < save_run.weekly_limit;
}

export function applySaveRun(input: SaveRunInput): { quest: Quest; save_run: SaveRunState } {
  if (!input.week_key.trim()) throw new Error('week_key is required');
  assertIsoDateString(input.extended_deadline_at, 'extended_deadline_at');
  assertQuestActive(input.quest);

  if (!canUseSaveRun(input.save_run, input.week_key)) {
    throw new Error('save run weekly limit exceeded');
  }

  const currentDeadline = Date.parse(input.quest.deadline_at);
  const extendedDeadline = Date.parse(input.extended_deadline_at);
  if (extendedDeadline <= currentDeadline) {
    throw new Error('extended_deadline_at must be after current deadline');
  }

  return {
    quest: {
      ...input.quest,
      deadline_at: input.extended_deadline_at,
    },
    save_run: {
      ...input.save_run,
      used_week_keys: [...input.save_run.used_week_keys, input.week_key],
    },
  };
}

export function updateCombo(input: ComboUpdateInput): ComboState {
  if (input.before_status === input.after_status) {
    return input.combo;
  }

  if (input.after_status === 'completed') {
    if (!input.completed_at) {
      throw new Error('completed_at is required when status becomes completed');
    }
    assertIsoDateString(input.completed_at, 'completed_at');

    const streakCurrent = input.combo.streak_current + 1;
    return {
      streak_current: streakCurrent,
      streak_best: Math.max(input.combo.streak_best, streakCurrent),
      last_completed_at: input.completed_at,
    };
  }

  if (input.after_status === 'failed') {
    return {
      ...input.combo,
      streak_current: 0,
    };
  }

  return input.combo;
}

