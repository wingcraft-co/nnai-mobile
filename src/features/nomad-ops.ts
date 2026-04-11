export type RiskState = 'safe' | 'warning' | 'critical' | 'overdue';

export function computeMustLeaveDate(entryDate: string, allowedDays: number): string {
  const base = new Date(`${entryDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + allowedDays);
  return base.toISOString().slice(0, 10);
}

export function deriveRiskState(
  today: string,
  mustLeaveDate: string,
  warningWindowDays: number,
): RiskState {
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
