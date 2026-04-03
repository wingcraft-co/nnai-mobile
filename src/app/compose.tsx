import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createPost, uploadPostImage } from '@/api/posts';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export default function ComposeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();

  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locatingCity, setLocatingCity] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const autofillCityIfAllowed = async () => {
      try {
        const Location = await import('expo-location');
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;

        setLocatingCity(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const city = geo[0]?.city ?? geo[0]?.subregion ?? geo[0]?.region ?? '';
        if (!cancelled && city) {
          setCityInput((prev) => (prev.trim() ? prev : city));
        }
      } catch {
        // ignore silent failure for auto-detection
      } finally {
        if (!cancelled) setLocatingCity(false);
      }
    };

    void autofillCityIfAllowed();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async () => {
    if (!pickedImageUri) {
      setError(t('사진을 선택해주세요.', 'Please select a photo.'));
      return;
    }

    if (!titleInput.trim() || !bodyInput.trim()) {
      setError(t('제목과 내용을 입력해주세요.', 'Please enter both title and content.'));
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSubmitting(true);
    setError(null);
    try {
      const uploadedImageUrl = await uploadPostImage(pickedImageUri);
      await createPost({
        title: titleInput.trim(),
        body: bodyInput.trim(),
        tags,
        city: cityInput.trim() || null,
        picture: uploadedImageUrl,
      });
      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('이미지 업로드 또는 글 작성에 실패했습니다.', 'Failed to upload image or create post.');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickFromGallery = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('사진 접근 권한이 필요합니다.', 'Photo library permission is required.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setPickedImageUri(result.assets[0].uri);
      setError(null);
    } catch {
      setError(
        t(
          '갤러리 모듈을 불러오지 못했습니다. 앱을 다시 실행해주세요.',
          'Failed to load gallery module. Please restart the app.',
        ),
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4" keyboardShouldPersistTaps="handled">
          <Animated.View
            entering={FadeInDown.duration(260)}
            className="rounded-[28px] border p-5 gap-4"
            style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => router.back()} className="rounded-full border px-3 py-1.5" style={{ borderColor: theme.border }}>
                <ThemedText className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                  {t('취소', 'Cancel')}
                </ThemedText>
              </Pressable>
              <ThemedText className="text-sm font-bold" style={{ color: theme.accent }}>
                {t('새 글 작성', 'Write Post')}
              </ThemedText>
              <Pressable
                onPress={() => void onSubmit()}
                disabled={submitting}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: theme.accent, opacity: submitting ? 0.7 : 1 }}>
                <ThemedText className="text-xs font-bold" style={{ color: '#fff' }}>
                  {submitting ? t('저장 중', 'Saving') : t('올리기', 'Post')}
                </ThemedText>
              </Pressable>
            </View>

            <View className="gap-2">
              <ThemedText className="text-xs font-bold uppercase tracking-[0.8px]" style={{ color: theme.textSecondary }}>
                {t('사진 선택', 'Pick Photo')}
              </ThemedText>
              <View className="rounded-2xl border overflow-hidden" style={{ borderColor: theme.border, height: 220 }}>
                {pickedImageUri ? (
                  <Image source={{ uri: pickedImageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View
                    className="flex-1 items-center justify-center"
                    style={{ backgroundColor: theme.backgroundSelected }}>
                    <ThemedText className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                      {t('사진을 선택해주세요', 'Please select a photo')}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => void onPickFromGallery()}
                  className="rounded-full border px-3 py-1.5"
                  style={{ borderColor: theme.border, backgroundColor: theme.backgroundSelected }}>
                  <ThemedText className="text-xs font-bold" style={{ color: theme.text }}>
                    {t('갤러리에서 선택', 'Pick from Gallery')}
                  </ThemedText>
                </Pressable>
                {pickedImageUri ? (
                  <Pressable
                    onPress={() => setPickedImageUri(null)}
                    className="rounded-full border px-3 py-1.5"
                    style={{ borderColor: theme.border }}>
                    <ThemedText className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                      {t('사진 제거', 'Remove Photo')}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

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
                minHeight: 120,
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
            {locatingCity ? (
              <ThemedText className="text-xs" style={{ color: theme.textSecondary }}>
                {t('현재 위치로 도시 확인 중...', 'Detecting city from current location...')}
              </ThemedText>
            ) : null}

            {error ? (
              <View className="rounded-xl border p-3" style={{ borderColor: theme.destructive }}>
                <ThemedText className="text-xs font-medium" style={{ color: theme.destructive }}>
                  {error}
                </ThemedText>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
