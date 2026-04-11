export type RiskState = 'safe' | 'warning' | 'critical' | 'overdue';

function assertValidDateString(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${label} must be a valid ISO date string`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} must be a valid ISO date string`);
  }
}

export function computeMustLeaveDate(entryDate: string, allowedDays: number): string {
  assertValidDateString(entryDate, 'entryDate');

  const base = new Date(`${entryDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + allowedDays);
  return base.toISOString().slice(0, 10);
}

export function deriveRiskState(
  today: string,
  mustLeaveDate: string,
  warningWindowDays: number,
): RiskState {
  assertValidDateString(today, 'today');
  assertValidDateString(mustLeaveDate, 'mustLeaveDate');

  const todayDate = new Date(`${today}T00:00:00Z`);
  const mustLeaveDateDate = new Date(`${mustLeaveDate}T00:00:00Z`);
  const diffDays = Math.floor(
    (mustLeaveDateDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (todayDate > mustLeaveDateDate) return 'overdue';
  if (diffDays === 0) return 'critical';
  if (diffDays <= warningWindowDays) return 'warning';
  return 'safe';
}

export function validateMoveConnection(input: {
  mustLeaveDate: string;
  departDate: string;
  arriveDate: string;
  checkinDate: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { mustLeaveDate, departDate, arriveDate, checkinDate } = input;

  if (departDate > mustLeaveDate) reasons.push('overstay_risk');
  if (arriveDate > checkinDate) reasons.push('checkin_mismatch');

  return {
    ok: reasons.length === 0,
    reasons,
  };
}
