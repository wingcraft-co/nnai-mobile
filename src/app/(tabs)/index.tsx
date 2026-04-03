import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchPosts, toggleLike } from '@/api/posts';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types/api';

export default function FeedScreen() {
  const theme = useTheme();
  const { t } = useI18n();
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
          post.id === postId ? { ...post, liked: result.liked, likes_count: Math.max(0, post.likes_count + (result.liked === post.liked ? 0 : result.liked ? 1 : -1)) } : post,
        ),
      );
    } catch {
      // Revert optimistic update
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

  return (
    <ScreenShell
      eyebrow="NNAI Nomad"
      title={t('이동하며 일하고 사는 사람들을 위한 소셜 레이어.', 'A social layer for people who live and work in motion.')}
      subtitle={t('실시간 커뮤니티 포스트를 확인해보세요.', 'Real-time community posts from the live network.')}
      refreshControl={refreshControl}>
      {error ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.destructive }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {!loading && posts.length === 0 ? (
        <View
          className="rounded-2xl border p-4"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-sm leading-5 font-medium" style={{ color: theme.textSecondary }}>
            {t('아직 포스트가 없습니다.', 'No posts yet.')}
          </ThemedText>
        </View>
      ) : null}

      {posts.map((post) => (
        <View
          key={post.id}
          className="rounded-3xl border p-6 gap-2"
          style={[
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText className="text-lg font-bold">{post.author}</ThemedText>
          <ThemedText className="text-[13px] font-semibold" style={{ color: theme.textSecondary }}>
            {post.city ?? t('도시 정보 없음', 'Unknown city')} · {new Date(post.created_at).toLocaleDateString()}
          </ThemedText>
          <ThemedText className="text-[21px] leading-7 font-bold">{post.title}</ThemedText>
          <ThemedText className="text-[15px] leading-6 font-medium" style={{ color: theme.textSecondary }}>
            {post.body}
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {post.tags.map((tag) => (
              <View
                key={tag}
                className="rounded-full border px-2 py-1"
                style={[
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                ]}>
                <ThemedText className="text-[13px] font-bold">#{tag}</ThemedText>
              </View>
            ))}
          </View>
          <Pressable
            className="self-start rounded-full border px-4 py-1"
            style={[
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
            ]}
            onPress={() => void onLike(post.id)}>
            <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
              {post.liked ? t('좋아요 취소', 'Liked') : t('좋아요', 'Like')} · {post.likes_count}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}
