import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
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
import { ScreenShell } from '@/components/screen-shell';
import { getLocalFeedImageByToken, getRandomFeedResourceImage } from '@/constants/feed-images';
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
      eyebrow="NNAI Nomad"
      invertEyebrow
      title={t('오늘의 출근 도장', "Today's check-in")}
      subtitle={t('지금 이 순간, 전 세계 노마드들도 일하고 있어요', "You're not alone — everyone's just starting")}
      refreshControl={refreshControl}>
      <Pressable
        className="self-start rounded-full border px-4 py-2"
        style={{ backgroundColor: theme.backgroundSelected, borderColor: theme.border }}
        onPress={() => router.push('/compose')}>
        <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
          {t('새 글 쓰기', 'Write a Post')}
        </ThemedText>
      </Pressable>

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

  const imageSource = useMemo(() => {
    const local = getLocalFeedImageByToken(post.picture);
    if (local) return local;
    if (post.picture?.trim()) return { uri: post.picture };
    return getRandomFeedResourceImage();
  }, [post.picture]);

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
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
          },
          frontAnimatedStyle,
        ]}>
        <Image source={imageSource} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <View
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            bottom: 8,
            backgroundColor: 'rgba(0,0,0,0.45)',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}>
          <ThemedText className="text-xs font-bold" style={{ color: '#fff' }} numberOfLines={1}>
            {post.title}
          </ThemedText>
        </View>
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
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            padding: 10,
            gap: 6,
          },
          backAnimatedStyle,
        ]}>
        <ThemedText className="text-xs font-bold" numberOfLines={1}>
          {post.title}
        </ThemedText>
        <ThemedText className="text-[11px] leading-4" style={{ color: theme.textSecondary }} numberOfLines={4}>
          {post.body}
        </ThemedText>
        <View className="flex-row flex-wrap gap-1">
          {post.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              className="rounded-full border px-2 py-0.5"
              style={{ backgroundColor: theme.backgroundSelected, borderColor: theme.border }}>
              <ThemedText className="text-[10px] font-bold">#{tag}</ThemedText>
            </View>
          ))}
        </View>
        <Pressable
          className="self-start rounded-full border px-2 py-1"
          style={{ backgroundColor: theme.backgroundSelected, borderColor: theme.border }}
          onPress={() => void onLike(post.id)}>
          <ThemedText className="text-[11px] font-bold" style={{ color: theme.accent }}>
            {post.liked ? t('좋아요 취소', 'Liked') : t('좋아요', 'Like')} · {post.likes_count}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Pressable>
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
