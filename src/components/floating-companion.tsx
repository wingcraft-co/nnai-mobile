import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CharacterAvatar } from '@/components/character-avatar';
import { SpeechBubble } from '@/components/speech-bubble';
import { getCompanionMessage } from '@/constants/companion-messages';
import type { CompanionContext } from '@/constants/companion-messages';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';

const IOS_TAB_BAR_HEIGHT = 84;
const COMPANION_TAB_BAR_CLEARANCE = -6;
const COMPANION_BOTTOM_OFFSET = IOS_TAB_BAR_HEIGHT + COMPANION_TAB_BAR_CLEARANCE;
const EASTER_EGG_URL = 'https://nnai.app';
const EASTER_EGG_PATTERNS = [
  '다음 도시를 찾아보자',
  '다음 목적지를 찾아보자',
  '새 도시',
  '새 나라',
  'new city',
  'new country',
  "find your next destination",
];

type Props = {
  context: CompanionContext;
};

function shouldOpenExternalForDestination(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return EASTER_EGG_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function FloatingCompanion({ context }: Props) {
  const { state } = useAuth();
  const { isKorean } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const personaType = state.status === 'authenticated' ? state.user.persona_type : null;

  const scale = useSharedValue(1);
  const bubbleOpacity = useSharedValue(0);

  const animatedCharStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
  }));

  const showBubble = useCallback(
    (ctx: CompanionContext) => {
      const msg = getCompanionMessage(ctx, isKorean);
      setMessage(msg);
      bubbleOpacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1.1, {}, () => {
        scale.value = withSpring(1);
      });

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        bubbleOpacity.value = withTiming(0, { duration: 300 });
      }, 3000);
    },
    [isKorean, bubbleOpacity, scale],
  );

  useEffect(() => {
    showBubble(context);
  }, [context, showBubble]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const onPressCharacter = useCallback(async () => {
    if (shouldOpenExternalForDestination(message)) {
      await Linking.openURL(EASTER_EGG_URL);
      return;
    }
    showBubble(context);
  }, [context, message, showBubble]);

  const onPressBubble = useCallback(async () => {
    if (!shouldOpenExternalForDestination(message)) return;
    await Linking.openURL(EASTER_EGG_URL);
  }, [message]);

  if (!personaType) return null;

  return (
    <View
      style={{
        position: 'absolute',
        right: 12,
        bottom: COMPANION_BOTTOM_OFFSET,
        zIndex: 100,
      }}
      pointerEvents="box-none">
      <View style={{ alignItems: 'flex-end' }}>
        <Animated.View style={[{ marginBottom: 6 }, animatedBubbleStyle]}>
          {message ? (
            <Pressable onPress={() => void onPressBubble()}>
              <SpeechBubble message={message} tailAlign="right" />
            </Pressable>
          ) : null}
        </Animated.View>

        <Pressable onPress={() => void onPressCharacter()}>
          <Animated.View
            style={[
              {
                width: 56,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
              },
              animatedCharStyle,
            ]}>
            <CharacterAvatar type={personaType} size={48} animated />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
