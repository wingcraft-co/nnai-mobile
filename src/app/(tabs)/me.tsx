import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, TextInput, View, useWindowDimensions } from 'react-native';

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
import { fetchCities, fetchCityStays } from '@/api/cities';
import { fetchProfile } from '@/api/profile';
import { CharacterAvatar } from '@/components/character-avatar';
import { GamePanel, ProgressMeter, StatTile } from '@/components/game-ui';
import { OpsRiskBadge } from '@/components/ops-risk-badge';
import { ScreenShell } from '@/components/screen-shell';
import { SpeechBubble } from '@/components/speech-bubble';
import { ThemedText } from '@/components/themed-text';
import { getPersonaTypeConfig } from '@/constants/persona-types';
import { computeMustLeaveDate, deriveRiskState, type RiskState } from '@/features/nomad-ops';
import { buildPersonaChatterLines, isSleepingByLocalTime } from '@/features/persona-companion';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { searchCities, searchCitiesLocal } from '@/data/nomad-cities';
import type { NomadCity } from '@/data/nomad-cities';
import { useAuth } from '@/store/auth-store';
import type {
  City,
  CityStay,
  LocalEventRec,
  PersonaType,
  PlannerBoard,
  PlannerTask,
  PioneerMilestone,
  Profile,
  WandererHop,
} from '@/types/api';

export default function MeScreen() {
  const theme = useTheme();
  const { t, isKorean } = useI18n();
  const { state, logout } = useAuth();
  const { height } = useWindowDimensions();
  const sectionHeight = Math.max(220, Math.round(height * 0.3));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plannerBoards, setPlannerBoards] = useState<PlannerBoard[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [plannerInput, setPlannerInput] = useState('');
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [wandererHops, setWandererHops] = useState<WandererHop[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currentStay, setCurrentStay] = useState<CityStay | null>(null);
  const [addingHop, setAddingHop] = useState(false);
  const [newHopCity, setNewHopCity] = useState('');
  const [newHopCountry, setNewHopCountry] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<NomadCity[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<NomadCity | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTaskIdRef = useRef(-1);
  const [localEvents, setLocalEvents] = useState<LocalEventRec[]>([]);
  const [pioneerMilestones, setPioneerMilestones] = useState<PioneerMilestone[]>([]);
  const [, setClockTick] = useState(0);
  const [chatterIndex, setChatterIndex] = useState(0);

  const personaType: PersonaType | null = state.status === 'authenticated' ? state.user.persona_type : null;
  const typeConfig = getPersonaTypeConfig(personaType);
  const actionType = typeConfig?.actionType ?? null;
  // Persona type names are product terms and should remain in English regardless of app language.
  const typeLabel = typeConfig?.label ?? typeConfig?.labelKr ?? '';
  const plannerDoneCount = useMemo(() => plannerTasks.filter((x) => x.is_done).length, [plannerTasks]);
  const localSavedCount = useMemo(() => localEvents.filter((x) => x.status !== 'recommended').length, [localEvents]);
  const characterLevel = useMemo(() => {
    const base = profile?.uid.length ?? 1;
    return 1 + ((base + plannerDoneCount + localSavedCount) % 7);
  }, [localSavedCount, plannerDoneCount, profile?.uid]);
  const streakDays = useMemo(() => 3 + ((plannerDoneCount + localSavedCount) % 5), [localSavedCount, plannerDoneCount]);
  const growthDone = useMemo(
    () => Number(plannerDoneCount > 0) + Number(localSavedCount > 0) + Number(streakDays >= 5),
    [localSavedCount, plannerDoneCount, streakDays],
  );
  const matchedCity = useMemo(
    () =>
      currentStay
        ? cities.find((city) => city.city.toLowerCase() === currentStay.city.toLowerCase()) ?? null
        : null,
    [cities, currentStay],
  );
  const chatterLines = useMemo(
    () => buildPersonaChatterLines({ isKorean, stay: currentStay, matchedCity }),
    [currentStay, isKorean, matchedCity],
  );
  const riskState: RiskState = useMemo(() => {
    if (!currentStay) return 'safe';
    const todayISO = new Date().toISOString().slice(0, 10);
    const mustLeaveDate = computeMustLeaveDate(currentStay.arrived_at, 90);
    return deriveRiskState(todayISO, mustLeaveDate, 7);
  }, [currentStay]);
  const chatter = chatterLines[chatterIndex % Math.max(1, chatterLines.length)] ?? '';
  const isSleeping = isSleepingByLocalTime(new Date());
  const companionBackdrop = isSleeping
    ? { background: '#1a2133', border: '#3a4d7a', overlay: '#7f97d9' }
    : { background: '#ffffff', border: '#d9b46b', overlay: '#ffdd8f' };

  const loadData = useCallback(async () => {
    const profileData = await fetchProfile();
    setProfile(profileData);
    const [stays, citiesData] = await Promise.all([fetchCityStays(), fetchCities()]);
    setCurrentStay(stays.find((s) => s.left_at === null) ?? null);
    setCities(citiesData);

    const currentType = actionType ?? getPersonaTypeConfig(profileData.persona_type)?.actionType ?? null;

    if (currentType === 'planner') {
      const boards = await fetchPlannerBoards();
      setPlannerBoards(boards);
      const boardWithTasks = (boards[0] as PlannerBoard & { tasks?: PlannerTask[] } | undefined)?.tasks ?? [];
      setPlannerTasks(boardWithTasks);
      return;
    }

    if (currentType === 'wanderer') {
      const hops = await fetchWandererHops();
      setWandererHops(hops);
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
  }, [actionType]);

  useEffect(() => {
    const chatterTimer = setInterval(() => {
      setChatterIndex((prev) => prev + 1);
    }, 30000);
    const clockTimer = setInterval(() => {
      setClockTick((prev) => prev + 1);
    }, 60000);
    return () => {
      clearInterval(chatterTimer);
      clearInterval(clockTimer);
    };
  }, []);

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

  const onAddPlannerTask = useCallback(async () => {
    const text = plannerInput.trim();
    if (!text) return;

    try {
      const board = await ensurePlannerBoard();
      const created = await createPlannerTask(board.id, { text });
      setPlannerTasks((prev) => [...prev, created]);
      setPlannerInput('');
    } catch (e: unknown) {
      // Keep checklist usable even when backend write fails.
      const fallbackTask: PlannerTask = {
        id: localTaskIdRef.current--,
        board_id: plannerBoards[0]?.id ?? -1,
        text,
        is_done: false,
        due_date: null,
        sort_order: plannerTasks.length + 1,
      };
      setPlannerTasks((prev) => [...prev, fallbackTask]);
      setPlannerInput('');
      setError(e instanceof Error ? e.message : t('추가에 실패했습니다. 로컬 체크리스트로 저장했습니다.', 'Failed to sync. Saved as local checklist item.'));
    }
  }, [ensurePlannerBoard, plannerBoards, plannerInput, plannerTasks.length, t]);

  const onTogglePlannerTask = useCallback(async (task: PlannerTask) => {
    const nextDone = !task.is_done;
    setPlannerTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, is_done: nextDone } : x)));

    if (task.id < 0) {
      return;
    }

    try {
      const updated = await patchPlannerTask(task.id, { is_done: nextDone });
      setPlannerTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: unknown) {
      setPlannerTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, is_done: task.is_done } : x)));
      setError(e instanceof Error ? e.message : t('수정에 실패했습니다.', 'Failed to update task.'));
    }
  }, [t]);

  const renderTypeAction = () => {
    if (!actionType) {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('유형이 설정되면 맞춤 액션이 표시됩니다.', 'Type actions will appear after your type is set.')}
          </ThemedText>
        </View>
      );
    }

    if (actionType === 'planner') {
      return (
        <View style={cardStyle(theme)}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
            {t('도시 체크리스트', 'City Checklist')} · {plannerDoneCount}/{plannerTasks.length}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={plannerInput}
              onChangeText={setPlannerInput}
              placeholder={t('할 일 추가... 예: 코워킹 데이패스 결제', 'Add a task... e.g. pay for coworking day pass')}
              placeholderTextColor={theme.textSecondary}
              style={{ ...inputStyle(theme), flex: 1 }}
            />
            <Pressable
              onPress={() => void onAddPlannerTask()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.backgroundSelected,
              }}>
              <ThemedText style={{ color: theme.accent, fontSize: 20, lineHeight: 22, fontWeight: '700' }}>+</ThemedText>
            </Pressable>
          </View>
          {plannerTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => void onTogglePlannerTask(task)}
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

    if (actionType === 'free_spirit') {
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

    if (actionType === 'wanderer') {
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
                  <View
                    key={hop.id}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      opacity: 0.7,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <Pressable onPress={() => void onSetFocus(hop.id)} style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                        {hop.to_city ?? hop.to_country}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>
                        {hop.status}
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => void onDeleteHop(hop.id)}>
                      <ThemedText style={{ fontSize: 11, color: theme.destructive }}>✕</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 새 행선지 추가 */}
          {addingHop ? (
            <View style={{ gap: 8 }}>
              {selectedCity ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: theme.accent, padding: 10 }}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                      {selectedCity.flag} {selectedCity.nameEn}, {selectedCity.countryEn}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                      {selectedCity.name}, {selectedCity.country}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => {
                    setSelectedCity(null);
                    setNewHopCity('');
                    setNewHopCountry('');
                    setCityQuery('');
                    setCityResults([]);
                  }}>
                    <ThemedText style={{ fontSize: 13, color: theme.destructive }}>✕</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={cityQuery}
                    onChangeText={(text) => {
                      setCityQuery(text);
                      // 로컬 즉시 결과
                      setCityResults(searchCitiesLocal(text));
                      // API 디바운스
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      if (text.trim().length > 0) {
                        setCitySearching(true);
                        debounceRef.current = setTimeout(() => {
                          void searchCities(text).then((results) => {
                            setCityResults(results);
                            setCitySearching(false);
                          });
                        }, 300);
                      } else {
                        setCitySearching(false);
                      }
                    }}
                    placeholder={t('도시 검색 (예: bangkok, 방콕)', 'Search city (e.g. bangkok)')}
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle(theme)}
                    autoFocus
                  />
                  {cityResults.length > 0 ? (
                    <View style={{ borderWidth: 1, borderColor: theme.border, maxHeight: 200 }}>
                      {cityResults.slice(0, 8).map((city) => (
                        <Pressable
                          key={`${city.nameEn}-${city.countryEn}`}
                          onPress={() => {
                            setSelectedCity(city);
                            setNewHopCity(city.nameEn);
                            setNewHopCountry(city.countryEn);
                            setCityQuery('');
                            setCityResults([]);
                          }}
                          style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                          <ThemedText style={{ fontSize: 13 }}>
                            {city.flag} {city.nameEn} · {city.name}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                            {city.countryEn} · {city.country}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : cityQuery.length > 0 && !citySearching ? (
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary, paddingVertical: 4 }}>
                      {t('검색 결과가 없습니다. 직접 입력하세요.', 'No results. Enter manually.')}
                    </ThemedText>
                  ) : null}
                  {citySearching ? (
                    <ActivityIndicator size="small" color={theme.accent} style={{ paddingVertical: 4 }} />
                  ) : null}
                  {cityQuery.length > 0 && cityResults.length === 0 && !citySearching ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        value={newHopCity}
                        onChangeText={setNewHopCity}
                        placeholder={t('도시명', 'City name')}
                        placeholderTextColor={theme.textSecondary}
                        style={inputStyle(theme)}
                      />
                      <TextInput
                        value={newHopCountry}
                        onChangeText={setNewHopCountry}
                        placeholder={t('국가명', 'Country name')}
                        placeholderTextColor={theme.textSecondary}
                        style={inputStyle(theme)}
                      />
                    </View>
                  ) : null}
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void onAddHop()} style={buttonStyle(theme)}>
                  <ThemedText style={buttonTextStyle(theme)}>{t('추가', 'Add')}</ThemedText>
                </Pressable>
                <Pressable onPress={() => {
                  setAddingHop(false);
                  setSelectedCity(null);
                  setCityQuery('');
                  setCityResults([]);
                  setNewHopCity('');
                  setNewHopCountry('');
                }} style={{ ...buttonStyle(theme), borderColor: theme.border }}>
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

    if (actionType === 'local') {
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
      eyebrow={t('캐릭터', 'Character')}
      title={typeLabel || t('캐릭터 허브', 'Character Hub')}
      subtitle={t('오늘 턴 진행에 맞춰 캐릭터 성장/특성 액션을 운영하세요.', 'Run growth and trait actions aligned with your daily turns.')}
      hideHero
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      <View
        style={{
          ...cardStyle(theme),
          backgroundColor: companionBackdrop.background,
          borderColor: companionBackdrop.border,
          height: sectionHeight,
          borderRadius: 18,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}>
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: companionBackdrop.border,
            backgroundColor: companionBackdrop.overlay,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ThemedText style={{ fontSize: 18, color: isSleeping ? '#f7f2c8' : '#8a5a00', fontWeight: '800' }}>
            {isSleeping ? '☾' : '☀'}
          </ThemedText>
        </View>

        <View style={{ position: 'absolute', right: 12, top: 12, alignItems: 'flex-end' }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.accent,
              backgroundColor: theme.backgroundSelected,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '800', color: theme.accent }}>{`LV.${characterLevel}`}</ThemedText>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 52 }}>
          <SpeechBubble message={chatter} />
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <CharacterAvatar type={personaType} size={Math.min(92, Math.round(sectionHeight * 0.3))} animated />
          <ThemedText style={{ fontSize: 11, color: isSleeping ? '#d5def2' : '#5b4a2a', marginTop: 6 }}>
            {isSleeping ? t('현지 시간: 수면 모드', 'Local time: sleeping mode') : t('현지 시간: 활동 모드', 'Local time: active mode')}
          </ThemedText>
        </View>
      </View>

      <GamePanel title={t('캐릭터 루프 상태', 'Character Loop Status')} subtitle={t('오늘 행동이 레벨과 타입 성장으로 연결됩니다.', 'Your daily actions feed level and type progression.')}>
        <OpsRiskBadge risk={riskState} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatTile label={t('레벨', 'Level')} value={`Lv.${characterLevel}`} tone="accent" />
          <StatTile label={t('연속 턴', 'Streak')} value={`${streakDays}${t('일', 'd')}`} />
          <StatTile label={t('유형', 'Type')} value={typeLabel || '-'} />
        </View>
        <ProgressMeter label={t('성장 체크포인트', 'Growth Checkpoints')} value={growthDone} max={3} />
        <View style={{ gap: 6, paddingTop: 2 }}>
          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
            {t('체크포인트 완료 방법', 'How to complete checkpoints')}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
            {t(
              '플래너 할 일 1개를 완료하고, 로컬 이벤트 1개를 저장하고, 연속 5일 턴을 달성하면 성장 체크포인트가 채워집니다.',
              'Complete 1 planner task, save 1 local event, and reach a 5-day streak to fill Growth Checkpoints.',
            )}
          </ThemedText>
          <View style={{ gap: 4 }}>
            <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
              {t('1. 플래너 할 일 1개 완료', '1. Complete 1 planner task')}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
              {t('2. 로컬 이벤트 1개 저장', '2. Save 1 local event')}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
              {t('3. 연속 5일 달성', '3. Reach a 5-day streak')}
            </ThemedText>
          </View>
        </View>
      </GamePanel>

      {error ? (
        <View style={{ ...cardStyle(theme), borderRadius: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
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
    borderRadius: 14,
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
    borderRadius: 12,
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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as const;
}

function buttonTextStyle(theme: ReturnType<typeof useTheme>) {
  return {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  } as const;
}
