import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, View } from 'react-native';

import {
  createPlannerBoard,
  createPlannerTask,
  createWandererHop,
  deleteWandererHop,
  fetchLocalEventsSaved,
  fetchPioneerMilestones,
  fetchPlannerBoards,
  fetchWandererHops,
  patchLocalEvent,
  patchPioneerMilestone,
  patchPlannerTask,
  patchWandererHop,
  saveLocalEvent,
  spinFreeSpirit,
} from '@/api/type-actions';
import { fetchCityStays } from '@/api/cities';
import { fetchProfile } from '@/api/profile';
import { CharacterAvatar } from '@/components/character-avatar';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { NomadTypes } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';
import type {
  CityStay,
  LocalEventRec,
  NomadType,
  PlannerBoard,
  PlannerTask,
  PioneerMilestone,
  Profile,
  WandererHop,
  WandererHopCondition,
} from '@/types/api';

export default function MeScreen() {
  const theme = useTheme();
  const { t, isKorean } = useI18n();
  const { state, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plannerBoards, setPlannerBoards] = useState<PlannerBoard[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [plannerInput, setPlannerInput] = useState('');
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [wandererHops, setWandererHops] = useState<WandererHop[]>([]);
  const [currentStay, setCurrentStay] = useState<CityStay | null>(null);
  const [addingHop, setAddingHop] = useState(false);
  const [newHopCity, setNewHopCity] = useState('');
  const [newHopCountry, setNewHopCountry] = useState('');
  const [localEvents, setLocalEvents] = useState<LocalEventRec[]>([]);
  const [pioneerMilestones, setPioneerMilestones] = useState<PioneerMilestone[]>([]);

  const nomadType: NomadType | null = state.status === 'authenticated' ? state.user.nomad_type : null;
  const typeConfig = nomadType ? NomadTypes[nomadType] : null;
  const typeLabel = typeConfig ? (isKorean ? typeConfig.labelKr : typeConfig.label) : '';
  const plannerDoneCount = useMemo(() => plannerTasks.filter((x) => x.is_done).length, [plannerTasks]);
  const localSavedCount = useMemo(() => localEvents.filter((x) => x.status !== 'recommended').length, [localEvents]);

  const loadData = useCallback(async () => {
    const profileData = await fetchProfile();
    setProfile(profileData);

    const currentType = nomadType ?? profileData.nomad_type;

    if (currentType === 'planner') {
      const boards = await fetchPlannerBoards();
      setPlannerBoards(boards);
      const boardWithTasks = (boards[0] as PlannerBoard & { tasks?: PlannerTask[] } | undefined)?.tasks ?? [];
      setPlannerTasks(boardWithTasks);
      return;
    }

    if (currentType === 'wanderer') {
      const [hops, stays] = await Promise.all([
        fetchWandererHops(),
        fetchCityStays(),
      ]);
      setWandererHops(hops);
      setCurrentStay(stays.find((s) => s.left_at === null) ?? null);
      return;
    }

    if (currentType === 'local') {
      setLocalEvents(await fetchLocalEventsSaved());
      return;
    }

    if (currentType === 'pioneer') {
      setPioneerMilestones(await fetchPioneerMilestones());
      return;
    }
  }, [nomadType]);

  useEffect(() => {
    loadData()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('데이터를 불러오지 못했습니다.', 'Failed to load data.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadData, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadData();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('새로고침에 실패했습니다.', 'Refresh failed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, t]);

  const ensurePlannerBoard = useCallback(async (): Promise<PlannerBoard> => {
    if (plannerBoards[0]) return plannerBoards[0];
    const created = await createPlannerBoard({
      country: 'Portugal',
      city: 'Lisbon',
      title: t('기본 체크리스트', 'Default checklist'),
    });
    setPlannerBoards((prev) => [created, ...prev]);
    return created;
  }, [plannerBoards, t]);

  const renderTypeAction = () => {
    if (!nomadType) {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('유형이 설정되면 맞춤 액션이 표시됩니다.', 'Type actions will appear after your type is set.')}
          </ThemedText>
        </View>
      );
    }

    if (nomadType === 'planner') {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
            {t('도시 체크리스트', 'City Checklist')} · {plannerDoneCount}/{plannerTasks.length}
          </ThemedText>
          <TextInput
            value={plannerInput}
            onChangeText={setPlannerInput}
            placeholder={t('할 일 추가...', 'Add a task...')}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle(theme)}
          />
          <Pressable
            onPress={() =>
              void (async () => {
                const text = plannerInput.trim();
                if (!text) return;
                try {
                  const board = await ensurePlannerBoard();
                  const created = await createPlannerTask(board.id, { text });
                  setPlannerTasks((prev) => [...prev, created]);
                  setPlannerInput('');
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : t('추가에 실패했습니다.', 'Failed to add task.'));
                }
              })()
            }
            style={buttonStyle(theme)}>
            <ThemedText style={buttonTextStyle(theme)}>{t('추가', 'Add')}</ThemedText>
          </Pressable>
          {plannerTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() =>
                void (async () => {
                  try {
                    const updated = await patchPlannerTask(task.id, { is_done: !task.is_done });
                    setPlannerTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : t('수정에 실패했습니다.', 'Failed to update task.'));
                  }
                })()
              }
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  backgroundColor: task.is_done ? theme.accent : 'transparent',
                }}
              />
              <ThemedText style={{ fontSize: 13, textDecorationLine: task.is_done ? 'line-through' : 'none' }}>
                {task.text}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      );
    }

    if (nomadType === 'free_spirit') {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{t('오늘의 카페 돌림판', "Today's Cafe Spinner")}</ThemedText>
          <Pressable
            onPress={() =>
              void (async () => {
                try {
                  const spin = await spinFreeSpirit({ lat: 37.5665, lng: 126.978, radius_m: 1500, keyword: 'cafe' });
                  setSpinResult(spin.selected.name);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : t('돌리기에 실패했습니다.', 'Failed to spin.'));
                }
              })()
            }
            style={buttonStyle(theme)}>
            <ThemedText style={buttonTextStyle(theme)}>{t('돌리기', 'Spin')}</ThemedText>
          </Pressable>
          <ThemedText style={{ fontSize: 14, color: theme.accent, fontWeight: '700' }}>
            {spinResult ? `${t('결과', 'Result')}: ${spinResult}` : t('아직 결과가 없어요.', 'No result yet.')}
          </ThemedText>
        </View>
      );
    }

    if (nomadType === 'wanderer') {
      const focusHop = wandererHops.find((h) => h.is_focus) ?? wandererHops[0] ?? null;
      const candidateHops = wandererHops.filter((h) => h !== focusHop);

      // 자동 조건 계산
      const visaAutoOk = focusHop
        ? ['Vietnam', 'Taiwan', 'Japan', 'Thailand', 'Portugal', 'Germany', 'France', 'Spain'].includes(focusHop.to_country)
        : false;
      const budgetAutoOk = currentStay?.budget_remaining != null && currentStay.budget_remaining > 0;

      const autoConditions = focusHop
        ? [
            { id: '__visa__', label: t('비자 무비자 확인', 'Visa-free check'), is_done: visaAutoOk },
            { id: '__budget__', label: t('예산 충분', 'Budget sufficient'), is_done: budgetAutoOk },
          ]
        : [];

      const allConditions = focusHop
        ? [...autoConditions, ...focusHop.conditions]
        : [];
      const fulfilledCount = allConditions.filter((c) => c.is_done).length;
      const totalCount = allConditions.length;
      const progressPct = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;

      const onToggleCondition = async (conditionId: string) => {
        if (!focusHop) return;
        const updated = focusHop.conditions.map((c) =>
          c.id === conditionId ? { ...c, is_done: !c.is_done } : c,
        );
        try {
          const result = await patchWandererHop(focusHop.id, { conditions: updated });
          setWandererHops((prev) => prev.map((h) => (h.id === result.id ? result : h)));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update.'));
        }
      };

      const onSetFocus = async (hopId: number) => {
        try {
          const updates = await Promise.all(
            wandererHops.map((h) =>
              patchWandererHop(h.id, { is_focus: h.id === hopId }),
            ),
          );
          setWandererHops(updates);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update.'));
        }
      };

      const onAddHop = async () => {
        if (!newHopCity.trim() || !newHopCountry.trim()) return;
        try {
          const created = await createWandererHop({
            to_city: newHopCity.trim(),
            to_country: newHopCountry.trim(),
            status: 'planned',
            conditions: [],
            is_focus: wandererHops.length === 0,
          });
          setWandererHops((prev) => [...prev, created]);
          setNewHopCity('');
          setNewHopCountry('');
          setAddingHop(false);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('추가 실패', 'Failed to add hop.'));
        }
      };

      const onDeleteHop = async (hopId: number) => {
        try {
          await deleteWandererHop(hopId);
          setWandererHops((prev) => prev.filter((h) => h.id !== hopId));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : t('삭제 실패', 'Failed to delete hop.'));
        }
      };

      return (
        <View style={cardStyle(theme)}>
          {/* 포커스 행선지 */}
          {focusHop ? (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.accent, letterSpacing: 1 }}>
                {t('다음 행선지', 'NEXT DESTINATION')}
              </ThemedText>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* 원형 프로그레스 */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 3,
                  borderColor: progressPct === 100 ? theme.accent : theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: progressPct === 100 ? theme.accent : theme.text }}>
                    {progressPct}%
                  </ThemedText>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                    {focusHop.to_city ? `${focusHop.to_city}, ` : ''}{focusHop.to_country}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.accent }}>
                    {focusHop.status.toUpperCase()}{focusHop.target_month ? ` · ${focusHop.target_month}` : ''}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                    {t('조건', 'Conditions')} {fulfilledCount}/{totalCount}
                  </ThemedText>
                </View>
              </View>

              {/* 조건 태그 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {autoConditions.map((c) => (
                  <View
                    key={c.id}
                    style={{
                      borderWidth: 1,
                      borderColor: c.is_done ? theme.accent : theme.border,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: c.is_done ? theme.accent : theme.textSecondary }}>
                      {c.is_done ? '✓ ' : '✗ '}{c.label}
                    </ThemedText>
                  </View>
                ))}
                {focusHop.conditions.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => void onToggleCondition(c.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: c.is_done ? theme.accent : theme.border,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: c.is_done ? theme.accent : theme.textSecondary }}>
                      {c.is_done ? '✓ ' : '○ '}{c.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
              {t('행선지 후보가 없습니다.', 'No destination set yet.')}
            </ThemedText>
          )}

          {/* 후보 도시 */}
          {candidateHops.length > 0 ? (
            <View style={{ gap: 6 }}>
              <ThemedText style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '700' }}>
                {t('후보', 'CANDIDATES')}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {candidateHops.map((hop) => (
                  <Pressable
                    key={hop.id}
                    onPress={() => void onSetFocus(hop.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      opacity: 0.7,
                    }}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                      {hop.to_city ?? hop.to_country}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>
                      {hop.status}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* 새 행선지 추가 */}
          {addingHop ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={newHopCity}
                onChangeText={setNewHopCity}
                placeholder={t('도시 (예: Da Nang)', 'City (e.g. Da Nang)')}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle(theme)}
              />
              <TextInput
                value={newHopCountry}
                onChangeText={setNewHopCountry}
                placeholder={t('국가 (예: Vietnam)', 'Country (e.g. Vietnam)')}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle(theme)}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void onAddHop()} style={buttonStyle(theme)}>
                  <ThemedText style={buttonTextStyle(theme)}>{t('추가', 'Add')}</ThemedText>
                </Pressable>
                <Pressable onPress={() => setAddingHop(false)} style={{ ...buttonStyle(theme), borderColor: theme.border }}>
                  <ThemedText style={{ ...buttonTextStyle(theme), color: theme.textSecondary }}>{t('취소', 'Cancel')}</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAddingHop(true)} style={buttonStyle(theme)}>
              <ThemedText style={buttonTextStyle(theme)}>
                {t('+ 행선지 추가', '+ Add Destination')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      );
    }

    if (nomadType === 'local') {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
            {t('근처 이벤트 추천 (5km)', 'Nearby Event Picks (5km)')} · {localSavedCount}
          </ThemedText>
          {localEvents.map((event) => (
            <View key={event.id} style={{ borderWidth: 1, borderColor: theme.border, padding: 10, gap: 6 }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{event.title}</ThemedText>
              <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>{event.source}</ThemedText>
              <Pressable
                onPress={() =>
                  void (async () => {
                    try {
                      const nextStatus: LocalEventRec['status'] =
                        event.status === 'recommended' ? 'saved' : event.status === 'saved' ? 'attended' : 'recommended';
                      if (event.status === 'recommended') {
                        const saved = await saveLocalEvent({
                          source: event.source,
                          source_event_id: event.source_event_id,
                          title: event.title,
                          venue_name: event.venue_name,
                          address: event.address,
                          country: event.country,
                          city: event.city,
                          starts_at: event.starts_at,
                          ends_at: event.ends_at,
                          lat: event.lat,
                          lng: event.lng,
                          radius_m: event.radius_m,
                        });
                        setLocalEvents((prev) =>
                          prev.map((x) => (x.id === event.id ? { ...x, id: saved.id, status: saved.status } : x)),
                        );
                      } else {
                        const updated = await patchLocalEvent(event.id, { status: nextStatus });
                        setLocalEvents((prev) =>
                          prev.map((x) => (x.id === updated.id ? { ...x, status: updated.status } : x)),
                        );
                      }
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update event.'));
                    }
                  })()
                }
                style={buttonStyle(theme)}>
                <ThemedText style={buttonTextStyle(theme)}>
                  {event.status === 'recommended'
                    ? t('관심 저장', 'Save')
                    : event.status === 'saved'
                      ? t('참석 완료', 'Mark Attended')
                      : t('다시 추천', 'Reset')}
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={cardStyle(theme)}>
        <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{t('정착 마일스톤', 'Settlement Milestones')}</ThemedText>
        {pioneerMilestones.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              void (async () => {
                const nextStatus: PioneerMilestone['status'] =
                  item.status === 'todo' ? 'doing' : item.status === 'doing' ? 'done' : 'todo';
                try {
                  const updated = await patchPioneerMilestone(item.id, { status: nextStatus });
                  setPioneerMilestones((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : t('업데이트 실패', 'Failed to update milestone.'));
                }
              })()
            }
            style={{ borderWidth: 1, borderColor: theme.border, padding: 10, gap: 4 }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>{item.title}</ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.accent }}>{item.status.toUpperCase()}</ThemedText>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScreenShell
      eyebrow={t('나', 'Me')}
      title={typeLabel || t('프로필', 'Profile')}
      subtitle={t('타입별 액션을 API 구조로 연결한 mock 모드입니다.', 'Type actions are now wired to API-shaped mock flows.')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      {error ? (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      {profile ? (
        <View style={{ ...cardStyle(theme), alignItems: 'center', gap: 8 }}>
          <CharacterAvatar type={nomadType} size={120} />
          <ThemedText style={{ fontSize: 16, fontWeight: '700', color: typeConfig?.color ?? theme.accent }}>
            {typeLabel}
          </ThemedText>
          {typeConfig ? (
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center' }}>
              {isKorean ? typeConfig.summaryKr : typeConfig.label}
            </ThemedText>
          ) : null}
          <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{profile.name}</ThemedText>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{profile.email}</ThemedText>
        </View>
      ) : null}

      {!loading ? renderTypeAction() : null}

      <Pressable onPress={() => void logout()} style={{ alignSelf: 'center', marginTop: 8 }}>
        <ThemedText style={{ fontSize: 12, color: theme.destructive }}>[ {t('로그아웃', 'Log out')} ]</ThemedText>
      </Pressable>
    </ScreenShell>
  );
}

function cardStyle(theme: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
  } as const;
}

function inputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 13,
    fontFamily: 'monospace',
  } as const;
}

function buttonStyle(theme: ReturnType<typeof useTheme>) {
  return {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.backgroundSelected,
    paddingHorizontal: 10,
    paddingVertical: 6,
  } as const;
}

function buttonTextStyle(theme: ReturnType<typeof useTheme>) {
  return {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  } as const;
}
