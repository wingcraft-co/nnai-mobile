import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, useWindowDimensions, View } from 'react-native';
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
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types/api';

export default function FeedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />,
    [onRefresh, refreshing, theme.accent],
  );
  const questTotal = 3;
  const questDone = Math.min(
    questTotal,
    Number(posts.length > 0) + Number(posts.some((post) => post.liked)) + Number(posts.some((post) => post.tags.length > 0)),
  );
  const energy = Math.max(0, 100 - questDone * 22);
  const xp = Math.min(100, 20 + questDone * 27);

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
      invertEyebrow
      showLogo
      title={t('노마드 라이프 시뮬', 'Nomad Life Sim')}
      subtitle={t('하루 1턴을 진행하며 도시/관계/성장을 동시에 관리하세요.', 'Play one turn a day and balance city, social, and growth.')}
      refreshControl={refreshControl}>
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
              {t('오늘의 상황 카드', 'TODAY SITUATION CARDS')}
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
  const authorId = post.user_id;
  const authorLevel = getPostAuthorLevel(post);

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
          ID:{authorId}
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
        {post.picture?.trim() ? (
          <Image source={{ uri: post.picture }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSelected }}>
            <CharacterAvatar type={post.author_nomad_type} size={80} />
          </View>
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
    t('체크인 1회', '1 Check-in'),
    t('좋아요 또는 댓글 1회', '1 Like or Comment'),
    t('내일 이동 후보 검토', 'Review Next Destination'),
  ];

  return (
    <GamePanel title={t('턴 대시보드', 'Turn Dashboard')} subtitle={t('하루 1턴을 완료하면 다음 이벤트가 열립니다.', 'Complete one daily turn to unlock your next event.')}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile label={t('에너지', 'ENERGY')} value={`${energy}%`} />
        <StatTile label={t('성장치', 'XP')} value={`${xp}%`} tone="accent" />
        <StatTile label={t('완료', 'DONE')} value={`${questDone}/${questTotal}`} />
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
