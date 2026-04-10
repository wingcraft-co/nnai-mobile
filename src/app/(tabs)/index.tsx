import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fetchPosts, toggleLike } from '@/api/posts';
import { CharacterAvatar } from '@/components/character-avatar';
import { GamePanel, PixelButton, ProgressMeter, StatTile } from '@/components/game-ui';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import {
  applyDeadlineResult,
  applySaveRun,
  canUseSaveRun,
  createQuest,
  submitProof,
  updateCombo,
} from '@/features/quest-engine';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { trackQuestEvent } from '@/lib/analytics';
import { validatePrProofUrl } from '@/lib/pr-proof';
import type { Post } from '@/types/api';
import type { ComboState, Quest, SaveRunState } from '@/types/quest';

const TURN_QUEST_TOTAL = 3;
const ENERGY_STEP = 22;
const PROGRESS_BASE = 20;
const PROGRESS_STEP = 27;
const SAVE_RUN_EXTENSION_MINUTES = 15;
const QUEST_STORYLINES = [
  {
    ko: '랜딩페이지 1섹션 완료',
    en: 'Finish one landing page section',
  },
  {
    ko: '핵심 문장 3개 다듬기',
    en: 'Polish three core copy lines',
  },
  {
    ko: '버그 1개 완전 제거',
    en: 'Eliminate one bug completely',
  },
  {
    ko: '온보딩 흐름 1단계 개선',
    en: 'Improve one onboarding step',
  },
];

function makeQuestId(): string {
  return `quest-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

function defaultDeadlineFromNow(nowIso: string): string {
  return addMinutes(nowIso, 8 * 60);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getWeekKey(nowIso: string, _timezone: string): string {
  const d = new Date(nowIso);
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const day = (new Date(utc).getUTCDay() + 6) % 7;
  const thursday = new Date(utc - day * 86_400_000 + 3 * 86_400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function resolveQuestTitle(index: number, t: (ko: string, en: string) => string): string {
  const storyline = QUEST_STORYLINES[index % QUEST_STORYLINES.length];
  return t(storyline.ko, storyline.en);
}

function deriveLevel(completedCount: number): number {
  return Math.max(1, Math.floor(completedCount / 2) + 1);
}

function deriveLevelTitle(level: number, t: (ko: string, en: string) => string): string {
  if (level >= 10) return t('길드 마스터', 'Guild Master');
  if (level >= 7) return t('시스템 빌더', 'System Builder');
  if (level >= 5) return t('퀘스트 헌터', 'Quest Hunter');
  if (level >= 3) return t('루틴 수호자', 'Routine Keeper');
  return t('노마드 수습생', 'Nomad Apprentice');
}

function deriveLevelProgress(completedCount: number): { current: number; max: number } {
  const max = 2;
  const current = (completedCount % max) + 1;
  return { current, max };
}

export default function FeedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );
  const [serverNow, setServerNow] = useState<string>(() => new Date().toISOString());
  const [quest, setQuest] = useState<Quest>(() =>
    createQuest({
      id: makeQuestId(),
      title: resolveQuestTitle(0, t),
      timezone,
      created_at: new Date().toISOString(),
      deadline_at: defaultDeadlineFromNow(new Date().toISOString()),
    }),
  );
  const [combo, setCombo] = useState<ComboState>({
    streak_current: 0,
    streak_best: 0,
    last_completed_at: null,
  });
  const [completedCount, setCompletedCount] = useState(0);
  const [questStoryIndex, setQuestStoryIndex] = useState(0);
  const [saveRun, setSaveRun] = useState<SaveRunState>({
    weekly_limit: 1,
    used_week_keys: [],
  });
  const [proofInput, setProofInput] = useState('');
  const [questNotice, setQuestNotice] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const data = await fetchPosts();
    setPosts(data);
  }, []);

  useEffect(() => {
    loadPosts()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('피드를 불러오지 못했습니다.', 'Failed to load feed.');
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadPosts, t]);

  useFocusEffect(
    useCallback(() => {
      if (loading) return;
      void loadPosts().catch((e: unknown) => {
        const message = e instanceof Error ? e.message : t('피드를 불러오지 못했습니다.', 'Failed to load feed.');
        setError(message);
      });
    }, [loadPosts, loading, t]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await loadPosts();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('피드를 새로고침하지 못했습니다.', 'Failed to refresh feed.');
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [loadPosts, t]);

  useEffect(() => {
    const id = setInterval(() => {
      setServerNow(new Date().toISOString());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (quest.status !== 'active') return;
    const nextQuest = applyDeadlineResult({ quest, server_now: serverNow });
    if (nextQuest === quest) return;

    setQuest(nextQuest);
    setCombo((prev) =>
      updateCombo({
        combo: prev,
        before_status: quest.status,
        after_status: nextQuest.status,
        completed_at: nextQuest.completed_at,
      }),
    );
    trackQuestEvent({
      name: 'quest_failed',
      quest_id: quest.id,
      occurred_at: serverNow,
      metadata: { reason: 'deadline_passed' },
    });
    setQuestNotice(t('마감 시간이 지나 퀘스트가 실패했습니다.', 'Quest failed after deadline.'));
  }, [quest, serverNow, t]);

  const createNextQuest = useCallback(() => {
    const createdAt = serverNow;
    const nextStoryIndex = questStoryIndex + 1;
    const nextQuest = createQuest({
      id: makeQuestId(),
      title: resolveQuestTitle(nextStoryIndex, t),
      timezone,
      created_at: createdAt,
      deadline_at: defaultDeadlineFromNow(createdAt),
    });
    setQuest(nextQuest);
    setQuestStoryIndex(nextStoryIndex);
    setProofInput('');
    setQuestNotice(
      t(
        '새 퀘스트가 열렸습니다. 1개만 끝내도 오늘은 승리입니다.',
        'A new quest is live. One clear means today is a win.',
      ),
    );
    trackQuestEvent({
      name: 'quest_created',
      quest_id: nextQuest.id,
      occurred_at: createdAt,
    });
  }, [questStoryIndex, serverNow, t, timezone]);

  const onSubmitProof = useCallback(() => {
    if (quest.status !== 'active') {
      setQuestNotice(t('이미 종료된 퀘스트입니다.', 'This quest is already closed.'));
      return;
    }

    const validation = validatePrProofUrl(proofInput);
    if (!validation.ok) {
      setQuestNotice(t('PR 링크 형식이 올바르지 않습니다.', 'Invalid PR URL format.'));
      trackQuestEvent({
        name: 'proof_rejected',
        quest_id: quest.id,
        occurred_at: serverNow,
        metadata: { code: validation.code },
      });
      return;
    }

    try {
      const nextQuest = submitProof({
        quest,
        proof_url: validation.normalized_url,
        submitted_at: serverNow,
        server_now: serverNow,
      });
      setQuest(nextQuest);
      setCompletedCount((prev) => prev + 1);
      setCombo((prev) =>
        updateCombo({
          combo: prev,
          before_status: quest.status,
          after_status: nextQuest.status,
          completed_at: nextQuest.completed_at,
        }),
      );
      setQuestNotice(t('증빙이 제출되어 퀘스트를 완료했습니다.', 'Proof submitted, quest completed.'));
      setProofInput(validation.normalized_url);
      trackQuestEvent({
        name: 'proof_submitted',
        quest_id: quest.id,
        occurred_at: serverNow,
        metadata: {
          owner: validation.owner,
          repo: validation.repo,
          pr_number: validation.pr_number,
        },
      });
      trackQuestEvent({
        name: 'quest_completed',
        quest_id: quest.id,
        occurred_at: serverNow,
      });
    } catch (e: unknown) {
      setQuestNotice(
        e instanceof Error
          ? e.message
          : t('증빙 제출 중 오류가 발생했습니다.', 'Failed to submit proof.'),
      );
    }
  }, [proofInput, quest, serverNow, t]);

  const onUseSaveRun = useCallback(() => {
    if (quest.status !== 'active') {
      setQuestNotice(t('활성 퀘스트에서만 세이브 런을 사용할 수 있습니다.', 'Save Run works only for active quests.'));
      return;
    }

    const weekKey = getWeekKey(serverNow, timezone);
    if (!canUseSaveRun(saveRun, weekKey)) {
      setQuestNotice(t('이번 주 세이브 런을 이미 사용했습니다.', 'Save Run already used this week.'));
      return;
    }

    try {
      const result = applySaveRun({
        quest,
        save_run: saveRun,
        week_key: weekKey,
        extended_deadline_at: addMinutes(quest.deadline_at, SAVE_RUN_EXTENSION_MINUTES),
      });
      setQuest(result.quest);
      setSaveRun(result.save_run);
      setQuestNotice(
        t('세이브 런 발동: 마감이 15분 연장되었습니다.', 'Save Run activated: deadline extended by 15 minutes.'),
      );
      trackQuestEvent({
        name: 'save_run_used',
        quest_id: quest.id,
        occurred_at: serverNow,
        metadata: { week_key: weekKey },
      });
    } catch (e: unknown) {
      setQuestNotice(
        e instanceof Error
          ? e.message
          : t('세이브 런 처리 중 오류가 발생했습니다.', 'Failed to process Save Run.'),
      );
    }
  }, [quest, saveRun, serverNow, t, timezone]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />,
    [onRefresh, refreshing, theme.accent],
  );
  const remainingMs = Math.max(0, Date.parse(quest.deadline_at) - Date.parse(serverNow));
  const remainingLabel = formatRemaining(remainingMs);
  const currentWeekKey = getWeekKey(serverNow, timezone);
  const canUseSaveRunNow = canUseSaveRun(saveRun, currentWeekKey);
  const level = deriveLevel(completedCount);
  const levelTitle = deriveLevelTitle(level, t);
  const levelProgress = deriveLevelProgress(completedCount);
  const questTotal = TURN_QUEST_TOTAL;
  const questDone = Math.min(
    questTotal,
    Number(posts.length > 0) + Number(posts.some((post) => post.liked)) + Number(posts.some((post) => post.tags.length > 0)),
  );
  const energy = Math.max(0, 100 - questDone * ENERGY_STEP);
  const xp = Math.min(100, PROGRESS_BASE + questDone * PROGRESS_STEP);

  const onLike = useCallback(async (postId: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes_count: post.liked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1,
            }
          : post,
      ),
    );

    try {
      const result = await toggleLike(postId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: result.liked,
                likes_count: Math.max(
                  0,
                  post.likes_count + (result.liked === post.liked ? 0 : result.liked ? 1 : -1),
                ),
              }
            : post,
        ),
      );
    } catch {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked: !post.liked,
                likes_count: post.liked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1,
              }
            : post,
        ),
      );
    }
  }, []);

  const pages = useMemo(() => chunk(posts, 4), [posts]);
  const cardSize = useMemo(() => {
    const horizontalPadding = 32; // ScreenShell content p-4 on both sides
    const gap = 8; // gap-2
    return Math.max(120, (width - horizontalPadding - gap) / 2);
  }, [width]);

  return (
    <ScreenShell
      eyebrow={t('오늘의 턴', 'Today Turn')}
      title={t('노마드 라이프 시뮬', 'Nomad Life Sim')}
      subtitle={t('하루 1턴을 진행하며 도시/관계/성장을 동시에 관리하세요.', 'Play one turn a day and balance city, social, and growth.')}
      hideHero
      refreshControl={refreshControl}>
      <QuestLoopPanel
        theme={theme}
        t={t}
        quest={quest}
        combo={combo}
        saveRun={saveRun}
        completedCount={completedCount}
        level={level}
        levelTitle={levelTitle}
        levelProgress={levelProgress}
        proofInput={proofInput}
        remainingLabel={remainingLabel}
        canUseSaveRunNow={canUseSaveRunNow}
        notice={questNotice}
        onChangeProofInput={setProofInput}
        onSubmitProof={onSubmitProof}
        onUseSaveRun={onUseSaveRun}
        onCreateNextQuest={createNextQuest}
      />
      <TurnBoard
        theme={theme}
        t={t}
        energy={energy}
        xp={xp}
        questDone={questDone}
        questTotal={questTotal}
      />
      <PixelButton label={t('턴 이벤트 작성', 'Create Turn Event')} onPress={() => router.push('/compose')} />

      {error ? (
        <View className="rounded-2xl border p-4" style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.destructive }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {!loading && posts.length === 0 ? (
        <View className="rounded-2xl border p-4" style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('아직 포스트가 없습니다.', 'No posts yet.')}
          </ThemedText>
        </View>
      ) : null}

      {pages.map((page, pageIndex) => (
        <View key={`page-${pageIndex}`} className="gap-2">
          {pageIndex === 0 ? (
            <ThemedText className="text-xs font-bold" style={{ color: theme.textSecondary, letterSpacing: 1 }}>
              {t('오늘의 출근 도장', 'TODAY ATTENDANCE CHECK')}
            </ThemedText>
          ) : null}
          <View className="flex-row flex-wrap justify-between">
            {page.map((post) => (
              <FlipPostCard
                key={post.id}
                post={post}
                theme={theme}
                t={t}
                onLike={onLike}
                cardSize={cardSize}
              />
            ))}
          </View>
        </View>
      ))}
    </ScreenShell>
  );
}

function FlipPostCard({
  post,
  onLike,
  theme,
  t,
  cardSize,
}: {
  post: Post;
  onLike: (postId: number) => Promise<void>;
  theme: ReturnType<typeof useTheme>;
  t: (ko: string, en: string) => string;
  cardSize: number;
}) {
  const flip = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageRetryNonce, setImageRetryNonce] = useState(0);
  const authorLevel = getPostAuthorLevel(post);
  const hasPicture = Boolean(post.picture?.trim());
  const showImageFallback = !hasPicture || imageFailed;
  const imageUri = hasPicture ? appendRetryNonce(post.picture!, imageRetryNonce) : null;
  const fallbackTitle = imageFailed
    ? t('이미지를 불러오지 못했습니다.', 'Image failed to load')
    : t('이미지 준비 중', 'Image coming soon');
  const fallbackBody = imageFailed
    ? t('카드를 눌러 이미지를 다시 시도하세요.', 'Tap the card to retry the image.')
    : t('상황 카드 데이터가 동기화되면 표시됩니다.', 'Card media will appear after sync.');

  useEffect(() => {
    setImageFailed(false);
    setImageRetryNonce(0);
  }, [post.picture]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const toggleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    flip.value = withTiming(next ? 1 : 0, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  };

  const retryImage = () => {
    if (!hasPicture) return;
    setImageFailed(false);
    setImageRetryNonce((prev) => prev + 1);
  };

  return (
    <Pressable
      onPress={toggleFlip}
      style={{ width: cardSize, height: cardSize, marginBottom: 8 }}
      className="relative">
      <Animated.View
        style={[
          {
            backfaceVisibility: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
          frontAnimatedStyle,
        ]}>
        <ThemedText
          className="text-[10px] font-bold"
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 20,
            color: '#ffffff',
          }}>
          {t('노마드 포스트', 'Nomad Post')}
        </ThemedText>
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 20,
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 2,
            borderColor: theme.accent,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <ThemedText className="text-[10px] font-bold" style={{ color: theme.accent }}>
            LV.{authorLevel}
          </ThemedText>
        </View>
        {!showImageFallback && imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Pressable
            disabled={!imageFailed}
            onPress={(event) => {
              event.stopPropagation();
              retryImage();
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.backgroundSelected,
              paddingHorizontal: 14,
              gap: 8,
            }}>
            <CharacterAvatar type={post.author_persona_type ?? 'local'} size={64} />
            <ThemedText className="text-xs font-bold" style={{ color: theme.text }}>
              {fallbackTitle}
            </ThemedText>
            <ThemedText className="text-center text-[11px]" style={{ color: theme.textSecondary, lineHeight: 16 }}>
              {fallbackBody}
            </ThemedText>
            {imageFailed ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.accent,
                  backgroundColor: theme.backgroundElement,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                <ThemedText className="text-[11px] font-bold" style={{ color: theme.accent }}>
                  {t('다시 시도', 'Retry image')}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        )}
      </Animated.View>

      <Animated.View
        style={[
          {
            backfaceVisibility: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 18,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            padding: 10,
            gap: 6,
            justifyContent: 'space-between',
          },
          backAnimatedStyle,
        ]}>
        <View style={{ gap: 8 }}>
          <ThemedText className="text-[10px] font-bold" style={{ color: theme.textSecondary }}>
            {t('한 마디', 'One-liner')}
          </ThemedText>
          <View className="flex-row flex-wrap gap-1">
            {(post.tags.length > 0 ? post.tags.slice(0, 1) : [t('일상', 'daily')]).map((tag) => (
              <View
                key={tag}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSelected,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                <ThemedText className="text-xs font-bold">#{tag}</ThemedText>
              </View>
            ))}
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSelected,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}>
            <ThemedText className="text-[11px] font-bold" style={{ color: theme.textSecondary }}>
              {t('좋아요', 'Likes')} {post.likes_count}
            </ThemedText>
          </View>
          <Pressable
            className="self-start rounded-full border px-2 py-1"
            style={{ backgroundColor: theme.backgroundSelected, borderColor: theme.border }}
            onPress={() => void onLike(post.id)}>
            <ThemedText className="text-[11px] font-bold" style={{ color: theme.accent }}>
              {post.liked ? t('좋아요 취소', 'Liked') : t('좋아요', 'Like')}
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function getPostAuthorLevel(post: Post): number {
  if (typeof post.author_level === 'number' && Number.isFinite(post.author_level)) {
    return Math.max(1, Math.floor(post.author_level));
  }
  // Fallback until backend sends author_level: deterministic pseudo level from user_id.
  const seed = post.user_id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (seed % 25) + 1;
}

function QuestLoopPanel({
  theme,
  t,
  quest,
  combo,
  saveRun,
  completedCount,
  level,
  levelTitle,
  levelProgress,
  proofInput,
  remainingLabel,
  canUseSaveRunNow,
  notice,
  onChangeProofInput,
  onSubmitProof,
  onUseSaveRun,
  onCreateNextQuest,
}: {
  theme: ReturnType<typeof useTheme>;
  t: (ko: string, en: string) => string;
  quest: Quest;
  combo: ComboState;
  saveRun: SaveRunState;
  completedCount: number;
  level: number;
  levelTitle: string;
  levelProgress: { current: number; max: number };
  proofInput: string;
  remainingLabel: string;
  canUseSaveRunNow: boolean;
  notice: string | null;
  onChangeProofInput: (value: string) => void;
  onSubmitProof: () => void;
  onUseSaveRun: () => void;
  onCreateNextQuest: () => void;
}) {
  const saveRunsUsed = saveRun.used_week_keys.length;
  const saveRunCaption = `${saveRunsUsed}/${Math.max(1, saveRun.weekly_limit)}`;

  return (
    <GamePanel
      title={t('데일리 퀘스트', 'Daily Quest')}
      subtitle={t('오늘의 1퀘스트를 닫고 콤보를 지키세요.', 'Close one quest today and protect your combo.')}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile label={t('레벨', 'Level')} value={`LV.${level}`} tone="accent" />
        <StatTile label={t('칭호', 'Title')} value={levelTitle} />
      </View>

      <ProgressMeter
        label={t('다음 레벨까지', 'To Next Level')}
        value={levelProgress.current}
        max={levelProgress.max}
      />

      <View style={{ gap: 8 }}>
        <ThemedText className="text-xs font-bold" style={{ color: theme.textSecondary }}>
          {t('퀘스트', 'Quest')}
        </ThemedText>
        <ThemedText className="text-base font-extrabold">{quest.title}</ThemedText>
        <ThemedText className="text-xs font-semibold" style={{ color: theme.textSecondary, lineHeight: 18 }}>
          {t(
            '오늘 이 퀘스트를 닫으면 루틴 XP를 확보합니다. 실패해도 세이브 런으로 한 번 구조할 수 있습니다.',
            'Closing this quest earns routine XP. If you slip, Save Run can rescue once.',
          )}
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile label={t('상태', 'Status')} value={quest.status.toUpperCase()} tone={quest.status === 'failed' ? 'danger' : 'default'} />
        <StatTile label={t('남은 시간', 'Time Left')} value={remainingLabel} tone="accent" />
        <StatTile label={t('콤보', 'Combo')} value={`${combo.streak_current}`} />
      </View>

      <View style={{ gap: 8 }}>
        <TextInput
          value={proofInput}
          onChangeText={onChangeProofInput}
          editable={quest.status === 'active'}
          placeholder={t('https://github.com/org/repo/pull/123', 'https://github.com/org/repo/pull/123')}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surfaceMuted,
            color: theme.text,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 12,
            fontWeight: '600',
          }}
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <PixelButton
            label={t('증빙 제출', 'Submit Proof')}
            onPress={onSubmitProof}
            tone="accent"
          />
          <PixelButton
            label={
              canUseSaveRunNow
                ? t('세이브 런(15분)', 'Save Run (15m)')
                : t('세이브 런 소진', 'Save Run Exhausted')
            }
            onPress={onUseSaveRun}
            tone={canUseSaveRunNow ? 'neutral' : 'accent'}
          />
          <PixelButton
            label={t('새 퀘스트', 'New Quest')}
            onPress={onCreateNextQuest}
            tone="neutral"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile label={t('최고 콤보', 'Best Combo')} value={`${combo.streak_best}`} tone="accent" />
        <StatTile label={t('주간 세이브런', 'Weekly Save')} value={saveRunCaption} />
      </View>
      <StatTile label={t('총 완료 퀘스트', 'Total Clears')} value={`${completedCount}`} />

      {quest.status === 'completed' ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.accent,
            borderRadius: 12,
            backgroundColor: theme.surfaceSelected,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          <ThemedText className="text-xs font-extrabold" style={{ color: theme.accent, lineHeight: 18 }}>
            {t(
              '보상: 루틴 XP +1, 콤보 유지. 다음 퀘스트를 열고 흐름을 이어가세요.',
              'Reward: Routine XP +1, combo preserved. Open next quest to keep momentum.',
            )}
          </ThemedText>
        </View>
      ) : null}

      {notice ? (
        <ThemedText className="text-xs font-bold" style={{ color: theme.textSecondary, lineHeight: 18 }}>
          {notice}
        </ThemedText>
      ) : null}
    </GamePanel>
  );
}

function TurnBoard({
  theme,
  t,
  energy,
  xp,
  questDone,
  questTotal,
}: {
  theme: ReturnType<typeof useTheme>;
  t: (ko: string, en: string) => string;
  energy: number;
  xp: number;
  questDone: number;
  questTotal: number;
}) {
  const quests = [
    t('포스트 1개 이상 유지', 'Keep at least one post'),
    t('좋아요한 포스트 1개 만들기', 'Have one liked post'),
    t('태그가 있는 포스트 1개 확인', 'Have one tagged post'),
  ];
  const isTurnComplete = questDone >= questTotal;

  return (
    <GamePanel title={t('턴 대시보드', 'Turn Dashboard')} subtitle={t('하루 1턴을 완료하면 다음 이벤트가 열립니다.', 'Complete one daily turn to unlock your next event.')}>
      <View style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <View pointerEvents={isTurnComplete ? 'none' : 'auto'} style={{ opacity: isTurnComplete ? 0.35 : 1 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile label={t('에너지', 'Energy')} value={`${energy}%`} />
            <StatTile label={t('진행도', 'Progress')} value={`${xp}%`} tone="accent" />
            <StatTile label={t('완료', 'Completed')} value={`${questDone}/${questTotal}`} />
          </View>
          <ProgressMeter label={t('오늘의 퀘스트', 'Today Quests')} value={questDone} max={questTotal} />
          <View style={{ gap: 6 }}>
            {quests.map((quest, idx) => (
              <ThemedText
                key={quest}
                className="text-xs font-bold"
                style={{ color: idx < questDone ? theme.accent : theme.textSecondary }}>
                {idx < questDone ? '✓ ' : '○ '} {quest}
              </ThemedText>
            ))}
          </View>
        </View>
        {isTurnComplete ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                borderWidth: 2,
                borderColor: theme.accent,
                backgroundColor: '#ffffffee',
                paddingHorizontal: 16,
                paddingVertical: 10,
                transform: [{ rotate: '-8deg' }],
              }}>
              <ThemedText style={{ color: theme.accent, fontWeight: '800', letterSpacing: 1.1 }}>
                {t('완료 스탬프', 'COMPLETED STAMP')}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </View>
    </GamePanel>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function appendRetryNonce(uri: string, nonce: number): string {
  if (nonce === 0) return uri;
  return `${uri}${uri.includes('?') ? '&' : '?'}retry=${nonce}`;
}
