import type { City, CityStay } from '@/types/api';

export const WORLD_AVERAGE_SLEEP_START_HOUR = 23;
export const WORLD_AVERAGE_WAKE_HOUR = 7;

export function isSleepingByLocalTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= WORLD_AVERAGE_SLEEP_START_HOUR || hour < WORLD_AVERAGE_WAKE_HOUR;
}

export function buildPersonaChatterLines(params: {
  isKorean: boolean;
  stay: CityStay | null;
  matchedCity: City | null;
  now?: Date;
}): string[] {
  const { isKorean, stay, matchedCity, now = new Date() } = params;
  if (!stay) {
    return isKorean
      ? ['현재 도시를 먼저 설정해줘.', '도시 설정하면 바로 브리핑할게.']
      : ['Set your current city first.', 'Once set, I can brief you.'];
  }

  const sleeping = isSleepingByLocalTime(now);
  const days = Math.max(
    0,
    Math.floor((new Date(now.toISOString().slice(0, 10)).getTime() - new Date(stay.arrived_at).getTime()) / 86400000),
  );
  const visaText = stay.visa_expires_at
    ? Math.floor((new Date(stay.visa_expires_at).getTime() - new Date(now.toISOString().slice(0, 10)).getTime()) / 86400000)
    : null;

  if (isKorean) {
    return [
      sleeping
        ? `${stay.city} 밤 시간대야.`
        : `${stay.city} 활동 시간대야.`,
      `${stay.city}${stay.country ? `, ${stay.country}` : ''} ${days}일째.`,
      stay.budget_remaining != null ? `예산 $${Math.round(stay.budget_remaining)} 남음.` : '예산 데이터 없음.',
      visaText != null ? `비자 D-${visaText}.` : '비자 만료일 없음.',
      matchedCity
        ? `월 $${matchedCity.monthly_cost_usd ?? '-'} · ${matchedCity.internet_mbps ?? '-'}Mbps · 안전 ${matchedCity.safety_score ?? '-'}.`
        : '도시 지표 매칭 없음.',
    ];
  }

  return [
    sleeping
      ? `${stay.city} is in sleep hours.`
      : `${stay.city} is in active hours.`,
    `${days} days in ${stay.city}${stay.country ? `, ${stay.country}` : ''}.`,
    stay.budget_remaining != null ? `Budget left: $${Math.round(stay.budget_remaining)}.` : 'No budget data.',
    visaText != null ? `Visa: D-${visaText}.` : 'No visa expiry data.',
    matchedCity
      ? `Cost $${matchedCity.monthly_cost_usd ?? '-'} · ${matchedCity.internet_mbps ?? '-'}Mbps · safety ${matchedCity.safety_score ?? '-'}.`
      : 'No city metrics.',
  ];
}
