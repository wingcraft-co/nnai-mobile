import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { createPost, fetchPosts, toggleLike } from '@/api/posts';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Post } from '@/types/api';

export default function FeedScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [cityInput, setCityInput] = useState('');

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

  const onCreate = useCallback(async () => {
    if (!titleInput.trim() || !bodyInput.trim()) {
      setError(t('제목과 내용을 입력해주세요.', 'Please enter both title and content.'));
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setCreating(true);
    setError(null);
    try {
      const created = await createPost({
        title: titleInput.trim(),
        body: bodyInput.trim(),
        tags,
        city: cityInput.trim() || null,
      });
      setPosts((prev) => [created, ...prev]);
      setTitleInput('');
      setBodyInput('');
      setTagsInput('');
      setCityInput('');
      setShowComposer(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('글 작성에 실패했습니다.', 'Failed to create post.');
      setError(message);
    } finally {
      setCreating(false);
    }
  }, [bodyInput, cityInput, tagsInput, t, titleInput]);

  const pages = useMemo(() => chunk(posts, 4), [posts]);
  const cardSize = useMemo(() => {
    const horizontalPadding = 32; // ScreenShell content p-4 on both sides
    const gap = 8; // gap-2
    return Math.max(120, (width - horizontalPadding - gap) / 2);
  }, [width]);

  return (
    <ScreenShell
      eyebrow="NNAI Nomad"
      title={t('피드를 눌러 뒤집고, 이야기와 태그를 확인하세요.', 'Tap cards to flip, then explore stories and tags.')}
      subtitle={t('4컷 그리드 기반 인터랙티브 피드.', 'Interactive feed with four-panel grid cards.')}
      refreshControl={refreshControl}>
      <Pressable
        className="self-start rounded-full border px-4 py-2"
        style={{ backgroundColor: theme.backgroundSelected, borderColor: theme.border }}
        onPress={() => setShowComposer((v) => !v)}>
        <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
          {showComposer ? t('작성 닫기', 'Close Composer') : t('새 글 쓰기', 'Write a Post')}
        </ThemedText>
      </Pressable>

      {showComposer ? (
        <View className="rounded-3xl border p-4 gap-2" style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <TextInput
            value={titleInput}
            onChangeText={setTitleInput}
            placeholder={t('제목', 'Title')}
            placeholderTextColor={theme.textSecondary}
            style={{
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <TextInput
            value={bodyInput}
            onChangeText={setBodyInput}
            placeholder={t('내용', 'Body')}
            placeholderTextColor={theme.textSecondary}
            multiline
            style={{
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              minHeight: 96,
              textAlignVertical: 'top',
            }}
          />
          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder={t('태그 (쉼표로 구분)', 'Tags (comma separated)')}
            placeholderTextColor={theme.textSecondary}
            style={{
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <TextInput
            value={cityInput}
            onChangeText={setCityInput}
            placeholder={t('도시 (선택)', 'City (optional)')}
            placeholderTextColor={theme.textSecondary}
            style={{
              color: theme.text,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <Pressable
            className="self-start rounded-full px-4 py-2"
            style={{ backgroundColor: theme.accent, opacity: creating ? 0.7 : 1 }}
            onPress={() => void onCreate()}
            disabled={creating}>
            <ThemedText className="text-sm font-bold" style={{ color: '#fff' }}>
              {creating ? t('작성 중...', 'Posting...') : t('피드에 올리기', 'Post to Feed')}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

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

  const imageUri = post.picture?.trim() ? post.picture : `https://picsum.photos/seed/nnai-${post.id}/600/600`;

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
        <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
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
