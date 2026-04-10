export type QuestStatus = 'active' | 'completed' | 'failed';

export type QuestProofKind = 'github_pr';

export type Quest = {
  id: string;
  title: string;
  timezone: string;
  created_at: string;
  deadline_at: string;
  status: QuestStatus;
  proof_kind: QuestProofKind;
  proof_url: string | null;
  completed_at: string | null;
  failed_at: string | null;
};

export type ComboState = {
  streak_current: number;
  streak_best: number;
  last_completed_at: string | null;
};

export type SaveRunState = {
  weekly_limit: number;
  used_week_keys: string[];
};

export type QuestEventName =
  | 'quest_created'
  | 'proof_submitted'
  | 'proof_rejected'
  | 'quest_completed'
  | 'quest_failed'
  | 'save_run_used';

export type QuestEvent = {
  name: QuestEventName;
  quest_id: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

