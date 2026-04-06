import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, TextInput, View } from 'react-native';

import { createCityStay, fetchCityStays, leaveCityStay, patchCityStay } from '@/api/cities';
import { GamePanel, ProgressMeter, StatTile } from '@/components/game-ui';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { searchCities, searchCitiesLocal } from '@/data/nomad-cities';
import type { NomadCity } from '@/data/nomad-cities';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { CityStay } from '@/types/api';

function daysBetween(from: string, toDate: string): number {
  const a = new Date(from).getTime();
  const b = new Date(toDate).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CityScreen() {
  const theme = useTheme();
  const { t } = useI18n();

  const [stays, setStays] = useState<CityStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 모드
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editArrivedAt, setEditArrivedAt] = useState('');
  const [editVisaExpiresAt, setEditVisaExpiresAt] = useState('');
  const [editBudgetRemaining, setEditBudgetRemaining] = useState('');
  const [saving, setSaving] = useState(false);

  // 새 도시 추가 모드 (이동 후)
  const [addingNew, setAddingNew] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newArrivedAt, setNewArrivedAt] = useState(todayISO());
  const [newVisaExpiresAt, setNewVisaExpiresAt] = useState('');
  const [newBudgetRemaining, setNewBudgetRemaining] = useState('');

  // 퍼지 검색
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<NomadCity[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [selectedNewCity, setSelectedNewCity] = useState<NomadCity | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 지나온 도시 접기
  const [pastExpanded, setPastExpanded] = useState(false);

  const currentStay = useMemo(
    () => stays.find((s) => s.left_at === null) ?? null,
    [stays],
  );
  const pastStays = useMemo(
    () =>
      stays
        .filter((s) => s.left_at !== null)
        .sort((a, b) => new Date(b.arrived_at).getTime() - new Date(a.arrived_at).getTime()),
    [stays],
  );

  const today = useMemo(() => todayISO(), []);
  const daysStayed = useMemo(
    () => (currentStay ? daysBetween(currentStay.arrived_at, today) : null),
    [currentStay, today],
  );
  const visaDaysLeft = useMemo(() => {
    if (!currentStay?.visa_expires_at) return null;
    const diff = Math.floor(
      (new Date(currentStay.visa_expires_at).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return diff;
  }, [currentStay, today]);
  const readinessDone = Number((visaDaysLeft ?? 0) > 7) + Number((currentStay?.budget_remaining ?? 0) > 0) + Number((daysStayed ?? 0) >= 2);

  const loadStays = useCallback(async () => {
    const data = await fetchCityStays();
    setStays(data);
  }, []);

  useEffect(() => {
    loadStays()
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('불러오기 실패', 'Failed to load'));
      })
      .finally(() => setLoading(false));
  }, [loadStays, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadStays();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('새로고침 실패', 'Refresh failed'));
    } finally {
      setRefreshing(false);
    }
  }, [loadStays, t]);

  const onStartEdit = useCallback(() => {
    if (!currentStay) return;
    setEditCity(currentStay.city);
    setEditCountry(currentStay.country ?? '');
    setEditArrivedAt(currentStay.arrived_at);
    setEditVisaExpiresAt(currentStay.visa_expires_at ?? '');
    setEditBudgetRemaining(currentStay.budget_remaining != null ? String(currentStay.budget_remaining) : '');
    setEditing(true);
  }, [currentStay]);

  const onSaveEdit = useCallback(async () => {
    if (!currentStay || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchCityStay(currentStay.id, {
        city: editCity.trim(),
        country: editCountry.trim() || null,
        arrived_at: editArrivedAt.trim(),
        visa_expires_at: editVisaExpiresAt.trim() || null,
        budget_remaining: editBudgetRemaining.trim() ? Number(editBudgetRemaining) : null,
      });
      setStays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('저장 실패', 'Save failed'));
    } finally {
      setSaving(false);
    }
  }, [currentStay, editArrivedAt, editBudgetRemaining, editCity, editCountry, editVisaExpiresAt, saving, t]);

  const onLeave = useCallback(async () => {
    if (!currentStay || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await leaveCityStay(currentStay.id);
      setStays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAddingNew(true);
      setNewArrivedAt(todayISO());
      setNewCity('');
      setNewCountry('');
      setNewVisaExpiresAt('');
      setNewBudgetRemaining('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('이동 처리 실패', 'Failed to leave'));
    } finally {
      setSaving(false);
    }
  }, [currentStay, saving, t]);

  const onConfirmLeave = useCallback(() => {
    if (!currentStay || saving) return;
    Alert.alert(
      t('이 도시 떠나기', 'Leave City'),
      t(
        '현재 도시를 떠나면 새 도시를 바로 입력하게 됩니다. 계속할까요?',
        'Leaving this city will start a new city flow. Continue?',
      ),
      [
        { text: t('취소', 'Cancel'), style: 'cancel' },
        { text: t('이 도시 떠나기', 'Leave City'), style: 'destructive', onPress: () => void onLeave() },
      ],
    );
  }, [currentStay, onLeave, saving, t]);

  const onCreateNew = useCallback(async () => {
    if (!newCity.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCityStay({
        city: newCity.trim(),
        country: newCountry.trim() || null,
        arrived_at: newArrivedAt.trim() || todayISO(),
        visa_expires_at: newVisaExpiresAt.trim() || null,
        budget_remaining: newBudgetRemaining.trim() ? Number(newBudgetRemaining) : null,
      });
      setStays((prev) => [...prev, created]);
      setAddingNew(false);
      setSelectedNewCity(null);
      setCityQuery('');
      setCityResults([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('저장 실패', 'Save failed'));
    } finally {
      setSaving(false);
    }
  }, [newArrivedAt, newBudgetRemaining, newCity, newCountry, newVisaExpiresAt, saving, t]);

  const card = {
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
  } as const;

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 13,
    fontFamily: 'monospace',
  } as const;

  const btnStyle = {
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.backgroundSelected,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  };

  return (
    <ScreenShell
      eyebrow={t('도시 운영', 'City Ops')}
      title={t('도시 운영 콘솔', 'City Operation Console')}
      subtitle={t('비자/예산/체류일을 관리하고 이동 이벤트 턴을 준비하세요.', 'Manage visa, budget, and stay days to prep your migration event turn.')}
      hideHero
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      <GamePanel title={t('이동 이벤트 준비도', 'Migration Readiness')} subtitle={t('비자/예산/체류 조건을 맞추면 이동 턴이 열립니다.', 'Hit visa, budget, and stay conditions to unlock migration turn.')}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatTile label={t('현재', 'Current')} value={currentStay?.city ?? t('미정', 'Unset')} />
          <StatTile
            label={t('비자', 'Visa')}
            value={visaDaysLeft != null ? `D-${visaDaysLeft}` : '—'}
            tone={visaDaysLeft != null && visaDaysLeft <= 7 ? 'danger' : 'default'}
          />
          <StatTile label={t('체류', 'Days')} value={String(daysStayed ?? '—')} />
        </View>
        <ProgressMeter label={t('턴 준비', 'Turn Ready')} value={readinessDone} max={3} />
      </GamePanel>

      {error ? (
        <View style={{ ...card, borderRadius: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      {/* 현재 도시 없고 추가 모드 아닐 때 */}
      {!loading && !currentStay && !addingNew ? (
        <View style={{ ...card, borderRadius: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('현재 도시가 없습니다.', 'No current city set.')}
          </ThemedText>
          <Pressable onPress={() => setAddingNew(true)} style={btnStyle}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
              {t('도시 추가', 'Add City')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* 새 도시 추가 폼 */}
      {addingNew ? (
        <View style={{ ...card, borderRadius: 16 }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.8 }}>
            {t('다음 체류 카드', 'Next Stay')}
          </ThemedText>
          <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
            {t('새 도시 입력', 'New City')}
          </ThemedText>
          {selectedNewCity ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: theme.accent, padding: 10 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                  {selectedNewCity.flag} {selectedNewCity.nameEn}, {selectedNewCity.countryEn}
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                  {selectedNewCity.name}, {selectedNewCity.country}
                </ThemedText>
              </View>
              <Pressable onPress={() => {
                setSelectedNewCity(null);
                setNewCity('');
                setNewCountry('');
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
                  setCityResults(searchCitiesLocal(text));
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
                style={inputStyle}
                autoFocus
              />
              {cityResults.length > 0 ? (
                <View style={{ borderWidth: 1, borderColor: theme.border, maxHeight: 200 }}>
                  {cityResults.slice(0, 8).map((city) => (
                    <Pressable
                      key={`${city.nameEn}-${city.countryEn}`}
                      onPress={() => {
                        setSelectedNewCity(city);
                        setNewCity(city.nameEn);
                        setNewCountry(city.countryEn);
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
                <>
                  <TextInput
                    value={newCity}
                    onChangeText={setNewCity}
                    placeholder={t('도시명', 'City name')}
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                  <TextInput
                    value={newCountry}
                    onChangeText={setNewCountry}
                    placeholder={t('국가명', 'Country name')}
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                </>
              ) : null}
            </>
          )}
          <TextInput
            value={newArrivedAt}
            onChangeText={setNewArrivedAt}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newVisaExpiresAt}
            onChangeText={setNewVisaExpiresAt}
            placeholder={t('비자 만료일 YYYY-MM-DD (선택)', 'Visa expiry YYYY-MM-DD (optional)')}
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={newBudgetRemaining}
            onChangeText={setNewBudgetRemaining}
            placeholder={t('잔여 예산 USD (선택)', 'Remaining budget USD (optional)')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => void onCreateNew()} disabled={saving || !newCity.trim()} style={[btnStyle, { opacity: saving || !newCity.trim() ? 0.6 : 1 }]}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                {saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => {
              setAddingNew(false);
              setSelectedNewCity(null);
              setCityQuery('');
              setCityResults([]);
              setNewCity('');
              setNewCountry('');
            }} style={{ ...btnStyle, borderColor: theme.border }}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>
                {t('취소', 'Cancel')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* 현재 도시 카드 */}
      {currentStay && !addingNew ? (
        <View style={{ ...card, borderRadius: 16 }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.8 }}>
            {t('현재 체류 카드', 'Current Stay')}
          </ThemedText>
          {editing ? (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                {t('정보 수정', 'Edit Info')}
              </ThemedText>
              <TextInput value={editCity} onChangeText={setEditCity} placeholder={t('도시명', 'City')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editCountry} onChangeText={setEditCountry} placeholder={t('국가', 'Country')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editArrivedAt} onChangeText={setEditArrivedAt} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editVisaExpiresAt} onChangeText={setEditVisaExpiresAt} placeholder={t('비자 만료일 YYYY-MM-DD', 'Visa expiry YYYY-MM-DD')} placeholderTextColor={theme.textSecondary} style={inputStyle} />
              <TextInput value={editBudgetRemaining} onChangeText={setEditBudgetRemaining} placeholder={t('잔여 예산 USD', 'Remaining budget USD')} placeholderTextColor={theme.textSecondary} keyboardType="numeric" style={inputStyle} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void onSaveEdit()} disabled={saving} style={[btnStyle, { opacity: saving ? 0.6 : 1 }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                    {saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => setEditing(false)} style={{ ...btnStyle, borderColor: theme.border }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>
                    {t('취소', 'Cancel')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1 }}>
                {t('현재 도시', 'CURRENT CITY')}
              </ThemedText>
              <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>
                {currentStay.city}{currentStay.country ? `, ${currentStay.country}` : ''}
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                {t('from', 'from')} {currentStay.arrived_at}
                {currentStay.visa_expires_at ? ` · ${t('비자 만료', 'visa exp.')} ${currentStay.visa_expires_at}` : ''}
              </ThemedText>

              {!currentStay.visa_expires_at ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.destructive,
                    backgroundColor: theme.background,
                    padding: 12,
                    gap: 8,
                  }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.destructive }}>
                    {t('VISA 설정 필요', 'Visa setup needed')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                    {t(
                      '현재 도시에는 비자 만료일이 없습니다. 도시 상세에서 비자 정보를 입력해야 이동 준비도를 정확히 계산할 수 있습니다.',
                      'This city has no visa expiry date yet. Edit city details to enter visa information and keep readiness accurate.',
                    )}
                  </ThemedText>
                  <Pressable onPress={onStartEdit} style={btnStyle}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                      {t('도시 상세 수정', 'Edit city details')}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}

              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 2 }}>
                {t('이동 준비 지표', 'Move Readiness')}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, padding: 10, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('체류', 'DAYS')}</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{daysStayed ?? '—'}</ThemedText>
                </View>
                <View style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: visaDaysLeft != null && visaDaysLeft <= 30 ? theme.destructive : theme.border,
                  backgroundColor: theme.background,
                  padding: 10,
                  alignItems: 'center',
                }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('비자', 'VISA')}</ThemedText>
                  <ThemedText style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: visaDaysLeft != null && visaDaysLeft <= 30 ? theme.destructive : theme.text,
                  }}>
                    {visaDaysLeft != null ? `D-${visaDaysLeft}` : '—'}
                  </ThemedText>
                </View>
                <View style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: currentStay.budget_remaining != null ? theme.accent : theme.border,
                  backgroundColor: theme.background,
                  padding: 10,
                  alignItems: 'center',
                }}>
                  <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>{t('예산', 'BUDGET')}</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '700', color: currentStay.budget_remaining != null ? theme.accent : theme.text }}>
                    {currentStay.budget_remaining != null ? `$${currentStay.budget_remaining}` : '—'}
                  </ThemedText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={onStartEdit} style={btnStyle}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
                    {t('수정', 'Edit')}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={onConfirmLeave} disabled={saving} style={[{ ...btnStyle, borderColor: theme.destructive, backgroundColor: 'transparent' }, { opacity: saving ? 0.6 : 1 }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.destructive }}>
                    {saving ? t('처리 중...', 'Processing...') : t('이 도시 떠나기', 'Leave City')}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}

      {/* 지나온 도시 */}
      {pastStays.length > 0 ? (
        <View style={card}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, letterSpacing: 0.8 }}>
            {t('지난 체류 카드', 'Past Stays')}
          </ThemedText>
          <Pressable onPress={() => setPastExpanded((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>
              {t('지나온 도시', 'Past Cities')} · {pastStays.length}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{pastExpanded ? '▲' : '▼'}</ThemedText>
          </Pressable>

          {pastExpanded ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              {pastStays.map((stay, idx) => {
                const days = stay.left_at ? daysBetween(stay.arrived_at, stay.left_at) : null;
                return (
                  <View
                    key={stay.id}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 10,
                      opacity: Math.max(0.4, 1 - idx * 0.15),
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                        {stay.city}{stay.country ? `, ${stay.country}` : ''}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>
                        {stay.arrived_at} – {stay.left_at}
                      </ThemedText>
                    </View>
                    {days != null ? (
                      <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>{days}{t('일', 'd')}</ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenShell>
  );
}
