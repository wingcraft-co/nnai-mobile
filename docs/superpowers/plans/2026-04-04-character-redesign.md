# Character-Centric Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 NNAI Nomad Mobile 앱을 5가지 노마드 캐릭터 타입 중심으로 리디자인하고, 3탭 구조 + 플로팅 동반자 + 픽셀/레트로 비주얼로 전환한다.

**Architecture:** 기존 Expo Router 파일 기반 라우팅 유지. 캐릭터 타입 설정(`nomad-types.ts`)을 중앙 허브로, 각 화면이 이를 참조하여 개인화. 플로팅 동반자는 탭 레이아웃에 오버레이.

**Tech Stack:** Expo 55, React Native 0.83, expo-router, expo-image, react-native-reanimated, NativeWind/Tailwind, TypeScript

**Design Spec:** `docs/superpowers/specs/2026-04-04-character-redesign-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/constants/nomad-types.ts` | 5 타입 정의, 색상, 에셋 매핑, 타입 유틸리티 |
| `src/constants/companion-messages.ts` | 플로팅 동반자 말풍선 메시지 정의 |
| `src/components/character-avatar.tsx` | 캐릭터 이미지 렌더링 (pixelated, fallback) |
| `src/components/speech-bubble.tsx` | 말풍선 UI 컴포넌트 |
| `src/components/floating-companion.tsx` | 플로팅 캐릭터 동반자 (애니메이션 + 말풍선) |
| `src/components/loading-screen.tsx` | Earth gif 로딩 화면 |
| `src/components/type-gate.tsx` | 타입 미지정 유저 안내 → nnai.app 유도 |
| `src/app/(tabs)/city.tsx` | 도시 탭 (디스커버+서클 통합) |
| `src/app/(tabs)/me.tsx` | 나 탭 (프로필+계획 통합) |

### Modified Files
| File | Changes |
|---|---|
| `src/types/api.ts` | User에 `nomad_type`, Post에 `author_nomad_type` 추가 |
| `src/constants/theme.ts` | Amber Mono 라이트 색상값 업데이트 |
| `src/data/dev-mock.ts` | 모든 mock 데이터에 `nomad_type` / `author_nomad_type` 추가 |
| `src/store/auth-store.ts` | User 타입 변경 자동 반영 (api.ts 의존) |
| `src/app/_layout.tsx` | LoadingScreen + TypeGate 적용 |
| `src/app/(tabs)/_layout.tsx` | 4탭 → 3탭, FloatingCompanion 오버레이 |
| `src/app/(tabs)/index.tsx` | 플립카드 레트로 리스킨 + 캐릭터 아이콘 |
| `src/components/screen-shell.tsx` | 레트로 스타일 리스킨 (radius 0, 그림자 제거) |

### Deleted Files
| File | Reason |
|---|---|
| `src/app/(tabs)/discover.tsx` | `city.tsx`로 대체 |
| `src/app/(tabs)/plans.tsx` | `me.tsx`로 통합 |
| `src/app/(tabs)/profile.tsx` | `me.tsx`로 대체 |

---

## Task 1: 타입 시스템 & 상수 업데이트

**Files:**
- Modify: `src/types/api.ts`
- Create: `src/constants/nomad-types.ts`
- Create: `src/constants/companion-messages.ts`
- Modify: `src/constants/theme.ts`

- [ ] **Step 1: `src/types/api.ts` — nomad_type 추가**

`NomadType` 타입을 정의하고 `User`, `Post` 타입에 추가한다.

```typescript
// src/types/api.ts — 파일 상단에 추가
export type NomadType = 'free_spirit' | 'local' | 'pioneer' | 'planner' | 'wanderer';

// User 타입 수정
export type User = {
  uid: string;
  name: string;
  picture: string;
  email?: string;
  nomad_type: NomadType | null;
};

// Post 타입 수정 — author_nomad_type 필드 추가
export type Post = {
  id: number;
  user_id: string;
  author: string;
  picture: string;
  title: string;
  body: string;
  tags: string[];
  city: string | null;
  likes_count: number;
  created_at: string;
  liked: boolean;
  author_nomad_type: NomadType;
};

// Profile 타입 수정 — nomad_type 추가
export type Profile = {
  uid: string;
  name: string;
  picture: string;
  email: string;
  nomad_type: NomadType | null;
  badges: string[];
  stats: {
    pins: number;
    posts: number;
    circles: number;
  };
};
```

나머지 타입(Comment, City, Circle, Pin, ChecklistItem, MovePlan)은 변경 없이 유지.

- [ ] **Step 2: `src/constants/nomad-types.ts` 생성**

```typescript
// src/constants/nomad-types.ts
import type { NomadType } from '@/types/api';

export type NomadTypeConfig = {
  label: string;
  labelKr: string;
  color: string;
  icon: number;       // require() returns number in RN
  iconGif: number;
  avatar: number;
  avatarGif: number;
};

export const NomadTypes: Record<NomadType, NomadTypeConfig> = {
  free_spirit: {
    label: 'Free Spirit',
    labelKr: '자유로운 영혼',
    color: '#b07cc6',
    icon: require('../../resources/character/free_spirit/free_spirit_64.png'),
    iconGif: require('../../resources/character/free_spirit/free_spirit_64.gif'),
    avatar: require('../../resources/character/free_spirit/free_spirit.png'),
    avatarGif: require('../../resources/character/free_spirit/free_spirit.gif'),
  },
  local: {
    label: 'Local',
    labelKr: '현지 탐험가',
    color: '#4eba8a',
    icon: require('../../resources/character/local/local_64.png'),
    iconGif: require('../../resources/character/local/local_64.gif'),
    avatar: require('../../resources/character/local/local.png'),
    avatarGif: require('../../resources/character/local/local.gif'),
  },
  pioneer: {
    label: 'Pioneer',
    labelKr: '개척자',
    color: '#d4a020',
    icon: require('../../resources/character/pioneer/pioneer_64.png'),
    iconGif: require('../../resources/character/pioneer/pioneer_64.gif'),
    avatar: require('../../resources/character/pioneer/pioneer.png'),
    avatarGif: require('../../resources/character/pioneer/pioneer.gif'),
  },
  planner: {
    label: 'Planner',
    labelKr: '계획형 여행자',
    color: '#4a7ab5',
    icon: require('../../resources/character/planner/planner_64.png'),
    iconGif: require('../../resources/character/planner/planner_64.gif'),
    avatar: require('../../resources/character/planner/planner.png'),
    avatarGif: require('../../resources/character/planner/planner.gif'),
  },
  wanderer: {
    label: 'Wanderer',
    labelKr: '방랑자',
    color: '#c75a3a',
    icon: require('../../resources/character/wanderer/wanderer_64.png'),
    iconGif: require('../../resources/character/wanderer/wanderer_64.gif'),
    avatar: require('../../resources/character/wanderer/wanderer.png'),
    avatarGif: require('../../resources/character/wanderer/wanderer.gif'),
  },
};

export const EarthAssets = {
  logo: require('../../resources/character/earth/earth_64.png'),
  logoGif: require('../../resources/character/earth/earth_64.gif'),
  full: require('../../resources/character/earth/earth.png'),
  fullGif: require('../../resources/character/earth/earth.gif'),
};

export function getNomadTypeConfig(type: NomadType | null): NomadTypeConfig | null {
  if (!type) return null;
  return NomadTypes[type] ?? null;
}
```

- [ ] **Step 3: `src/constants/companion-messages.ts` 생성**

```typescript
// src/constants/companion-messages.ts
export type CompanionContext =
  | 'feed'
  | 'feed_empty'
  | 'city'
  | 'me'
  | 'post_created'
  | 'liked';

const messagesKr: Record<CompanionContext, string[]> = {
  feed: ['새 포스트가 있어!', '오늘 뭘 써볼까?', '피드를 구경해봐~'],
  feed_empty: ['아직 포스트가 없어~', '첫 글을 써봐!'],
  city: ['새 도시를 탐험해봐!', '여긴 어때?', '다음 목적지를 찾아보자!'],
  me: ['오늘도 열심히!', '다음 도시는 어디?', '멋진 여정이야!'],
  post_created: ['좋은 글이야!', '공유해줘서 고마워!'],
  liked: ['나도 좋아!', '좋은 취향이야!'],
};

const messagesEn: Record<CompanionContext, string[]> = {
  feed: ['New posts are here!', 'What will you write today?', 'Check out the feed~'],
  feed_empty: ['No posts yet~', 'Write your first one!'],
  city: ['Explore a new city!', 'How about this one?', "Let's find your next destination!"],
  me: ['Keep it up!', "Where's next?", 'What a journey!'],
  post_created: ['Nice post!', 'Thanks for sharing!'],
  liked: ['I like it too!', 'Great taste!'],
};

export function getCompanionMessage(context: CompanionContext, isKorean: boolean): string {
  const messages = isKorean ? messagesKr[context] : messagesEn[context];
  return messages[Math.floor(Math.random() * messages.length)];
}
```

- [ ] **Step 4: `src/constants/theme.ts` — Amber Mono 색상 업데이트**

Colors 객체만 변경. Fonts, Spacing 등 나머지는 그대로 유지.

```typescript
// src/constants/theme.ts — Colors 객체를 다음으로 교체
export const Colors = {
  light: {
    text: '#333333',
    background: '#f8f8f8',
    backgroundElement: '#f2f2f2',
    backgroundSelected: '#e8e5e0',
    textSecondary: '#555555',
    accent: '#c47a1a',
    destructive: '#c53030',
    border: '#d5cfc5',
  },
  dark: {
    text: '#f3f3f3',
    background: '#1a1a1a',
    backgroundElement: '#2a2a2a',
    backgroundSelected: '#3a3a3a',
    textSecondary: '#999999',
    accent: '#d4952a',
    destructive: '#e05050',
    border: '#4a4540',
  },
} as const;
```

- [ ] **Step 5: 앱 빌드 확인**

Run: `cd /Users/yoroji/Documents/hackathon/nnai-mobile && npx expo start --clear` (터미널에서 빌드 에러 없는지 확인, 즉시 종료해도 됨)

- [ ] **Step 6: 커밋**

```bash
git add src/types/api.ts src/constants/nomad-types.ts src/constants/companion-messages.ts src/constants/theme.ts
git commit -m "feat: add nomad type system, companion messages, and amber mono theme"
```

---

## Task 2: Mock 데이터에 nomad_type 반영

**Files:**
- Modify: `src/data/dev-mock.ts`

- [ ] **Step 1: `dev-mock.ts` — User, Post, Profile에 nomad_type 추가**

변경할 부분:

1. `devUser` 객체에 `nomad_type: 'planner'` 추가
2. `profile` 객체에 `nomad_type: 'planner'` 추가
3. 모든 `posts` 배열의 각 Post에 `author_nomad_type` 추가 (다양하게 분배):

```typescript
// devUser 수정
const devUser: User = {
  uid: 'dev',
  name: tx('개발 사용자', 'Dev User'),
  picture: '',
  email: 'dev@nnai.app',
  nomad_type: 'planner',
};

// profile 수정
const profile: Profile = {
  uid: 'dev',
  name: tx('개발 사용자', 'Dev User'),
  picture: '',
  email: 'dev@nnai.app',
  nomad_type: 'planner',
  badges: [tx('얼리 노마드', 'Early Nomad'), tx('서클 호스트', 'Circle Host')],
  stats: {
    pins: 14,
    posts: 42,
    circles: 4,
  },
};
```

posts 배열의 각 항목에 `author_nomad_type` 추가 — 다양하게 분배:
- id 1 (Dev User): `author_nomad_type: 'planner'`
- id 2 (Mina Park): `author_nomad_type: 'planner'`
- id 3 (Suyeon Kim): `author_nomad_type: 'free_spirit'`
- id 4 (Alex Chen): `author_nomad_type: 'local'`
- id 5 (Yoonha Jung): `author_nomad_type: 'planner'`
- id 6 (Jin Lee): `author_nomad_type: 'pioneer'`
- id 7 (Minjae Park): `author_nomad_type: 'wanderer'`
- id 8 (Emma Cho): `author_nomad_type: 'local'`
- id 9 (Taehun Choi): `author_nomad_type: 'planner'`
- id 10 (Noah Kim): `author_nomad_type: 'wanderer'`

4. `devMockApiRequest` 함수의 POST `/api/mobile/posts` 핸들러에서 새 포스트 생성 시 `author_nomad_type: devUser.nomad_type ?? 'wanderer'` 추가

- [ ] **Step 2: 타입 에러 없는지 확인**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/data/dev-mock.ts
git commit -m "feat: add nomad_type to all mock data"
```

---

## Task 3: 공통 컴포넌트 — CharacterAvatar, SpeechBubble, LoadingScreen

**Files:**
- Create: `src/components/character-avatar.tsx`
- Create: `src/components/speech-bubble.tsx`
- Create: `src/components/loading-screen.tsx`

- [ ] **Step 1: `src/components/character-avatar.tsx` 생성**

```tsx
// src/components/character-avatar.tsx
import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getNomadTypeConfig } from '@/constants/nomad-types';
import type { NomadType } from '@/types/api';

type Props = {
  type: NomadType | null;
  size: number;
  animated?: boolean;
};

export function CharacterAvatar({ type, size, animated = false }: Props) {
  const config = getNomadTypeConfig(type);

  if (!config) {
    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#e8e5e0',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ThemedText style={{ fontSize: size * 0.4, fontWeight: 'bold' }}>?</ThemedText>
      </View>
    );
  }

  const source = animated ? config.avatarGif : config.avatar;
  const isSmall = size <= 64;
  const iconSource = animated ? config.iconGif : config.icon;

  return (
    <Image
      source={isSmall ? iconSource : source}
      style={{ width: size, height: size }}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}
```

- [ ] **Step 2: `src/components/speech-bubble.tsx` 생성**

```tsx
// src/components/speech-bubble.tsx
import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  message: string;
};

export function SpeechBubble({ message }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.backgroundElement,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        maxWidth: 180,
      }}>
      <ThemedText style={{ fontSize: 11, color: theme.text }}>{message}</ThemedText>
      {/* tail */}
      <View
        style={{
          position: 'absolute',
          bottom: -6,
          right: 12,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.border,
        }}
      />
    </View>
  );
}
```

- [ ] **Step 3: `src/components/loading-screen.tsx` 생성**

```tsx
// src/components/loading-screen.tsx
import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';

export function LoadingScreen() {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
      <Image
        source={EarthAssets.fullGif}
        style={{ width: 120, height: 120 }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <ThemedText style={{ fontSize: 12, color: theme.textSecondary, fontFamily: 'monospace' }}>
        loading...
      </ThemedText>
    </View>
  );
}
```

- [ ] **Step 4: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 5: 커밋**

```bash
git add src/components/character-avatar.tsx src/components/speech-bubble.tsx src/components/loading-screen.tsx
git commit -m "feat: add CharacterAvatar, SpeechBubble, and LoadingScreen components"
```

---

## Task 4: 플로팅 동반자 컴포넌트

**Files:**
- Create: `src/components/floating-companion.tsx`

- [ ] **Step 1: `src/components/floating-companion.tsx` 생성**

```tsx
// src/components/floating-companion.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
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
import { BottomTabInset } from '@/constants/theme';

type Props = {
  context: CompanionContext;
};

export function FloatingCompanion({ context }: Props) {
  const { state } = useAuth();
  const { isKorean } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nomadType =
    state.status === 'authenticated' ? state.user.nomad_type : null;

  // Animation values
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

  // Show bubble on context change (tab switch)
  useEffect(() => {
    showBubble(context);
  }, [context, showBubble]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const onPress = useCallback(() => {
    showBubble(context);
  }, [context, showBubble]);

  if (!nomadType) return null;

  return (
    <View
      style={{
        position: 'absolute',
        right: 16,
        bottom: BottomTabInset + 16,
        alignItems: 'flex-end',
        zIndex: 100,
      }}
      pointerEvents="box-none">
      {/* Speech bubble */}
      <Animated.View style={[{ marginBottom: 4 }, animatedBubbleStyle]}>
        {message ? <SpeechBubble message={message} /> : null}
      </Animated.View>

      {/* Character */}
      <Pressable onPress={onPress}>
        <Animated.View
          style={[
            {
              width: 56,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
            },
            animatedCharStyle,
          ]}>
          <CharacterAvatar type={nomadType} size={48} animated />
        </Animated.View>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/components/floating-companion.tsx
git commit -m "feat: add FloatingCompanion component with speech bubbles and animations"
```

---

## Task 5: TypeGate 컴포넌트

**Files:**
- Create: `src/components/type-gate.tsx`

- [ ] **Step 1: `src/components/type-gate.tsx` 생성**

```tsx
// src/components/type-gate.tsx
import { Image } from 'expo-image';
import React, { useCallback } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { fetchMe } from '@/api/auth';
import { useAuth } from '@/store/auth-store';
import { getToken } from '@/api/client';

export function TypeGate() {
  const theme = useTheme();
  const { t } = useI18n();
  const { login } = useAuth();

  const openTypeQuiz = useCallback(() => {
    void Linking.openURL('https://nnai.app/type-quiz');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const user = await fetchMe();
      if (user.nomad_type) {
        login(token, user);
      }
    } catch {
      // silently fail
    }
  }, [login]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 24,
      }}>
      <Image
        source={EarthAssets.fullGif}
        style={{ width: 100, height: 100 }}
        contentFit="contain"
      />

      <ThemedText style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
        {t('아직 노마드 타입이 정해지지 않았어요', "Your nomad type hasn't been set yet")}
      </ThemedText>

      <View
        style={{
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          maxWidth: 240,
        }}>
        <ThemedText style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
          {t(
            'nnai.app에서 나만의 타입을 찾아보세요!',
            'Find your type at nnai.app!',
          )}
        </ThemedText>
      </View>

      <Pressable
        onPress={openTypeQuiz}
        style={{
          backgroundColor: theme.accent,
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}>
        <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
          {t('타입 찾으러 가기', 'Find my type')}
        </ThemedText>
      </Pressable>

      <Pressable onPress={refresh}>
        <ThemedText style={{ color: theme.accent, fontSize: 12 }}>
          {t('이미 했어요 — 새로고침', "Already done — refresh")}
        </ThemedText>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/type-gate.tsx
git commit -m "feat: add TypeGate component for unassigned nomad type users"
```

---

## Task 6: ScreenShell 레트로 리스킨

**Files:**
- Modify: `src/components/screen-shell.tsx`

- [ ] **Step 1: ScreenShell을 레트로 스타일로 변경**

변경 사항:
- `rounded-[28px]` → radius 0 (직각 모서리)
- 그림자 제거 (shadowOpacity, elevation 제거)
- Earth 로고를 eyebrow 옆에 표시할 수 있도록 `showLogo` prop 추가

```tsx
// src/components/screen-shell.tsx — 전체 교체
import { Image } from 'expo-image';
import React, { PropsWithChildren } from 'react';
import { ScrollView, type RefreshControlProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { EarthAssets } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  invertEyebrow?: boolean;
  showLogo?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}>;

export function ScreenShell({
  children,
  eyebrow,
  title,
  subtitle,
  invertEyebrow = false,
  showLogo = false,
  refreshControl,
}: ScreenShellProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4"
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            borderWidth: 1,
            padding: 24,
            gap: 8,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {showLogo ? (
              <Image
                source={EarthAssets.logo}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
              />
            ) : null}
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: invertEyebrow ? theme.accent : 'transparent',
              }}>
              <ThemedText
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: invertEyebrow ? '#fff' : theme.accent,
                }}>
                {eyebrow}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={{ fontSize: 28, lineHeight: 34, fontWeight: '700' }}>
            {title}
          </ThemedText>
          <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/components/screen-shell.tsx
git commit -m "refactor: reskin ScreenShell to retro style with sharp corners and no shadows"
```

---

## Task 7: 루트 레이아웃 — LoadingScreen + TypeGate 적용

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: `_layout.tsx` 수정**

변경 사항:
- `state.status === 'loading'` 시 `LoadingScreen` 표시 (기존 `return null` 대체)
- 인증 후 `nomad_type === null` 이면 `TypeGate` 표시

```tsx
// src/app/_layout.tsx — 전체 교체
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import '@/global.css';
import { LoadingScreen } from '@/components/loading-screen';
import { TypeGate } from '@/components/type-gate';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/store/auth-store';

void SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { state } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (state.status === 'loading') {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (state.status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    }

    if (state.status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [router, segments, state.status]);

  useEffect(() => {
    if (state.status !== 'loading') {
      void SplashScreen.hideAsync();
    }
  }, [state.status]);

  if (state.status === 'loading') {
    return <LoadingScreen />;
  }

  if (state.status === 'authenticated' && state.user.nomad_type === null) {
    return <TypeGate />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="compose" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.backgroundElement,
      border: colors.border,
      notification: colors.accent,
      primary: colors.accent,
      text: colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/_layout.tsx
git commit -m "feat: integrate LoadingScreen and TypeGate into root layout"
```

---

## Task 8: 탭 레이아웃 — 4탭 → 3탭 + FloatingCompanion

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: `_layout.tsx` — 3탭으로 변경 + FloatingCompanion 오버레이**

```tsx
// src/app/(tabs)/_layout.tsx — 전체 교체
import { Tabs, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'react-native';

import { FloatingCompanion } from '@/components/floating-companion';
import type { CompanionContext } from '@/constants/companion-messages';
import { Colors } from '@/constants/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { t } = useI18n();
  const pathname = usePathname();

  const companionContext: CompanionContext = useMemo(() => {
    if (pathname.includes('city')) return 'city';
    if (pathname.includes('me')) return 'me';
    return 'feed';
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 84,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            fontFamily: 'monospace',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('피드', 'Feed'),
            tabBarIcon: ({ color }) => (
              <TabIcon label="F" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="city"
          options={{
            title: t('도시', 'City'),
            tabBarIcon: ({ color }) => (
              <TabIcon label="C" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t('나', 'Me'),
            tabBarIcon: ({ color }) => (
              <TabIcon label="M" color={color} />
            ),
          }}
        />
      </Tabs>
      <FloatingCompanion context={companionContext} />
    </View>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderWidth: 1,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <View>
          {/* Using a Text-based pixel icon */}
          <React.Fragment>
            {React.createElement(
              require('react-native').Text,
              { style: { color, fontSize: 14, fontFamily: 'monospace', fontWeight: '700' } },
              label,
            )}
          </React.Fragment>
        </View>
      </View>
    </View>
  );
}
```

NOTE: `TabIcon`을 더 심플하게 아래처럼 교체해도 됨:

```tsx
function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderWidth: 1,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color, fontSize: 14, fontFamily: 'monospace', fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}
```

import `Text` from `react-native` at the top.

- [ ] **Step 2: 기존 discover.tsx, plans.tsx, profile.tsx 삭제**

```bash
rm src/app/\(tabs\)/discover.tsx src/app/\(tabs\)/plans.tsx src/app/\(tabs\)/profile.tsx
```

- [ ] **Step 3: 커밋**

```bash
git add -A src/app/\(tabs\)/
git commit -m "feat: restructure to 3-tab layout with FloatingCompanion overlay"
```

---

## Task 9: 도시 탭 (`city.tsx`)

**Files:**
- Create: `src/app/(tabs)/city.tsx`

- [ ] **Step 1: `city.tsx` 생성 — 디스커버+서클 통합**

기존 `discover.tsx`의 로직을 기반으로, 추천 도시 섹션을 추가하고 레트로 스타일로 리스킨.

```tsx
// src/app/(tabs)/city.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';

import { fetchCities } from '@/api/cities';
import { fetchCircles, toggleCircleMembership } from '@/api/circles';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';
import { NomadTypes } from '@/constants/nomad-types';
import type { Circle, City } from '@/types/api';

export default function CityScreen() {
  const theme = useTheme();
  const { t, isKorean } = useI18n();
  const { state } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const nomadType = state.status === 'authenticated' ? state.user.nomad_type : null;
  const typeConfig = nomadType ? NomadTypes[nomadType] : null;

  const loadData = useCallback(async () => {
    const [cityData, circleData] = await Promise.all([fetchCities(), fetchCircles()]);
    setCities(cityData);
    setCircles(circleData);
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

  const onToggleCircle = useCallback(async (circleId: number) => {
    setCircles((prev) =>
      prev.map((c) =>
        c.id === circleId
          ? { ...c, joined: !c.joined, member_count: c.joined ? Math.max(0, c.member_count - 1) : c.member_count + 1 }
          : c,
      ),
    );
    try {
      const result = await toggleCircleMembership(circleId);
      setCircles((prev) =>
        prev.map((c) => {
          if (c.id !== circleId) return c;
          const nextCount = c.member_count + (result.joined === c.joined ? 0 : result.joined ? 1 : -1);
          return { ...c, joined: result.joined, member_count: Math.max(0, nextCount) };
        }),
      );
    } catch {
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circleId
            ? { ...c, joined: !c.joined, member_count: c.joined ? Math.max(0, c.member_count - 1) : c.member_count + 1 }
            : c,
        ),
      );
    }
  }, []);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        (c.city_kr && c.city_kr.includes(q)),
    );
  }, [cities, search]);

  // Recommended cities — sort by nomad_score descending
  const recommendedCities = useMemo(() => {
    return [...cities]
      .sort((a, b) => (b.nomad_score ?? 0) - (a.nomad_score ?? 0))
      .slice(0, 4);
  }, [cities]);

  const joinedCircles = useMemo(() => circles.filter((c) => c.joined), [circles]);

  const typeLabel = typeConfig
    ? isKorean
      ? typeConfig.labelKr
      : typeConfig.label
    : '';

  return (
    <ScreenShell
      eyebrow={t('도시', 'City')}
      title={t('노마드가 실제로 머무는 도시를 찾아보세요.', 'Discover where nomads actually stay.')}
      subtitle={t('타입별 추천 · 도시 정보 · 서클', 'Recommendations · City info · Circles')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('> 도시 검색...', '> Search cities...')}
        placeholderTextColor={theme.textSecondary}
        style={{
          backgroundColor: theme.backgroundElement,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          fontSize: 13,
          color: theme.text,
          fontFamily: 'monospace',
        }}
      />

      {error ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      {/* Recommended */}
      {!search.trim() && recommendedCities.length > 0 ? (
        <>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.accent }}>
            * {typeLabel}{t('에게 맞는 도시', "'s recommended cities")}
          </ThemedText>
          <FlatList
            horizontal
            data={recommendedCities}
            keyExtractor={(item) => item.city_id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <View
                style={{
                  width: 130,
                  backgroundColor: theme.backgroundElement,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  padding: 12,
                  gap: 4,
                }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>
                  {isKorean ? item.city_kr ?? item.city : item.city}
                </ThemedText>
                <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>
                  ${item.monthly_cost_usd ?? 'N/A'}/mo
                </ThemedText>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: theme.accent,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                  <ThemedText style={{ fontSize: 8, fontWeight: '700', color: theme.accent }}>
                    {t('추천', 'REC')}
                  </ThemedText>
                </View>
              </View>
            )}
          />
        </>
      ) : null}

      {/* All cities */}
      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('모든 도시', 'All Cities')}
      </ThemedText>
      {!loading && filteredCities.length === 0 ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('표시할 도시가 없습니다.', 'No cities to display.')}
          </ThemedText>
        </View>
      ) : null}
      {filteredCities.map((city) => (
        <View
          key={city.city_id}
          style={{
            backgroundColor: theme.backgroundElement,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            gap: 4,
          }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>
            {isKorean ? city.city_kr ?? city.city : city.city}, {city.country ?? city.country_id}
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
            ${city.monthly_cost_usd ?? 'N/A'}/mo · {city.internet_mbps ?? 'N/A'} Mbps
          </ThemedText>
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.accent }}>
            {t('안전', 'Safety')} {city.safety_score ?? '-'} · {t('영어', 'English')} {city.english_score ?? '-'} · {t('노마드', 'Nomad')} {city.nomad_score ?? '-'}
          </ThemedText>
        </View>
      ))}

      {/* Circles */}
      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
        {joinedCircles.length > 0 ? t('내 서클', 'My Circles') : t('서클', 'Circles')}
      </ThemedText>
      {!loading && circles.length === 0 ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('표시할 서클이 없습니다.', 'No circles to display.')}
          </ThemedText>
        </View>
      ) : null}
      {circles.map((circle) => (
        <View
          key={circle.id}
          style={{
            backgroundColor: theme.backgroundElement,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            gap: 4,
          }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>{circle.name}</ThemedText>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
            {circle.member_count} {t('명', 'members')}
          </ThemedText>
          {circle.description ? (
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{circle.description}</ThemedText>
          ) : null}
          <Pressable
            onPress={() => void onToggleCircle(circle.id)}
            style={{
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSelected,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginTop: 4,
            }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.accent }}>
              {circle.joined ? t('나가기', 'Leave') : t('가입', 'Join')}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/\(tabs\)/city.tsx
git commit -m "feat: add city tab combining discover and circles with retro style"
```

---

## Task 10: 나 탭 (`me.tsx`) — 프로필+계획 통합

**Files:**
- Create: `src/app/(tabs)/me.tsx`

- [ ] **Step 1: `me.tsx` 생성**

기존 `profile.tsx`와 `plans.tsx`의 로직을 합쳐 하나의 화면으로 통합. 캐릭터 이미지 표시.

```tsx
// src/app/(tabs)/me.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchMoves, toggleChecklistItem } from '@/api/moves';
import { fetchProfile } from '@/api/profile';
import { CharacterAvatar } from '@/components/character-avatar';
import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { NomadTypes } from '@/constants/nomad-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/store/auth-store';
import type { MovePlan, Profile } from '@/types/api';

export default function MeScreen() {
  const theme = useTheme();
  const { t, isKorean } = useI18n();
  const { state, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moves, setMoves] = useState<MovePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nomadType = state.status === 'authenticated' ? state.user.nomad_type : null;
  const typeConfig = nomadType ? NomadTypes[nomadType] : null;

  const loadData = useCallback(async () => {
    const [profileData, movesData] = await Promise.all([fetchProfile(), fetchMoves()]);
    setProfile(profileData);
    setMoves(movesData);
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

  const onToggleItem = useCallback(async (moveId: number, itemId: number) => {
    setMoves((prev) =>
      prev.map((move) =>
        move.id === moveId
          ? {
              ...move,
              checklist: move.checklist.map((item) =>
                item.id === itemId ? { ...item, is_done: !item.is_done } : item,
              ),
            }
          : move,
      ),
    );
    try {
      const updated = await toggleChecklistItem(moveId, itemId);
      setMoves((prev) =>
        prev.map((move) =>
          move.id === moveId
            ? { ...move, checklist: move.checklist.map((item) => (item.id === itemId ? updated : item)) }
            : move,
        ),
      );
    } catch {
      setMoves((prev) =>
        prev.map((move) =>
          move.id === moveId
            ? {
                ...move,
                checklist: move.checklist.map((item) =>
                  item.id === itemId ? { ...item, is_done: !item.is_done } : item,
                ),
              }
            : move,
        ),
      );
    }
  }, []);

  const localizeStage = useCallback(
    (stage: MovePlan['stage']) => {
      if (!isKorean) {
        if (stage === 'planning') return 'Planning';
        if (stage === 'booked') return 'Booked';
        return 'Completed';
      }
      if (stage === 'planning') return '계획중';
      if (stage === 'booked') return '예약완료';
      return '완료';
    },
    [isKorean],
  );

  const typeLabel = typeConfig
    ? isKorean
      ? typeConfig.labelKr
      : typeConfig.label
    : '';

  return (
    <ScreenShell
      eyebrow={t('나', 'Me')}
      title={typeLabel || t('프로필', 'Profile')}
      subtitle={t('내 여정과 계획을 한눈에.', 'Your journey and plans at a glance.')}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
      {error ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.destructive }}>{error}</ThemedText>
        </View>
      ) : null}

      {/* Character Profile */}
      {profile ? (
        <View
          style={{
            backgroundColor: theme.backgroundElement,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 24,
            alignItems: 'center',
            gap: 8,
          }}>
          <CharacterAvatar type={nomadType} size={120} />
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: typeConfig?.color ?? theme.accent,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
            {typeLabel}
          </ThemedText>
          <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{profile.name}</ThemedText>
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{profile.email}</ThemedText>
        </View>
      ) : null}

      {/* Stats */}
      {profile ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label={t('도시', 'Cities')} value={profile.stats.pins} theme={theme} />
          <StatCard label={t('포스트', 'Posts')} value={profile.stats.posts} theme={theme} />
          <StatCard label={t('서클', 'Circles')} value={profile.stats.circles} theme={theme} />
        </View>
      ) : null}

      {/* Move Plans */}
      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('이동 계획', 'Move Plans')}
      </ThemedText>
      {!loading && moves.length === 0 ? (
        <View style={{ backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t('아직 계획이 없어요. 새 도시로 떠나볼까?', 'No plans yet. Ready for a new city?')}
          </ThemedText>
        </View>
      ) : null}
      {moves.map((move) => (
        <View
          key={move.id}
          style={{
            backgroundColor: theme.backgroundElement,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 16,
            gap: 8,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>
              {move.from_city ?? '-'} → {move.to_city ?? '-'}
            </ThemedText>
            <View
              style={{
                borderWidth: 1,
                borderColor: move.stage === 'completed' ? theme.accent : theme.border,
                backgroundColor: move.stage === 'completed' ? theme.accent : 'transparent',
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}>
              <ThemedText
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: move.stage === 'completed' ? '#fff' : theme.accent,
                }}>
                {localizeStage(move.stage)}
              </ThemedText>
            </View>
          </View>

          {/* Checklist progress */}
          {move.checklist.length > 0 ? (
            <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontFamily: 'monospace' }}>
              [{move.checklist.filter((i) => i.is_done).map(() => '#').join('')}
              {move.checklist.filter((i) => !i.is_done).map(() => '-').join('')}]{' '}
              {move.checklist.filter((i) => i.is_done).length}/{move.checklist.length}
            </ThemedText>
          ) : null}

          {move.checklist.map((item) => (
            <Pressable
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 8,
              }}
              onPress={() => void onToggleItem(move.id, item.id)}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  backgroundColor: item.is_done ? theme.accent : 'transparent',
                }}
              />
              <ThemedText
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: item.is_done ? theme.textSecondary : theme.text,
                  textDecorationLine: item.is_done ? 'line-through' : 'none',
                }}>
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Badges */}
      {profile && profile.badges.length > 0 ? (
        <>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('뱃지', 'Badges')}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {profile.badges.map((badge) => (
              <View
                key={badge}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElement,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{badge}</ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Logout */}
      <Pressable
        onPress={() => void logout()}
        style={{ alignSelf: 'center', marginTop: 8 }}>
        <ThemedText style={{ fontSize: 12, color: theme.destructive }}>
          [ {t('로그아웃', 'Log out')} ]
        </ThemedText>
      </Pressable>
    </ScreenShell>
  );
}

function StatCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.backgroundElement,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 12,
        alignItems: 'center',
        gap: 2,
      }}>
      <ThemedText style={{ fontSize: 20, fontWeight: '700', color: theme.accent }}>{value}</ThemedText>
      <ThemedText style={{ fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase' }}>
        {label}
      </ThemedText>
    </View>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/\(tabs\)/me.tsx
git commit -m "feat: add me tab combining profile, stats, move plans, and badges"
```

---

## Task 11: 피드 플립카드 레트로 리스킨

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

- [ ] **Step 1: 피드 화면 수정**

주요 변경:
1. 카드 앞면에 작성자 캐릭터 아이콘(CharacterAvatar 64px) 추가
2. 타입 라벨 표시
3. radius 0으로 변경 (직각 모서리)
4. 그림자 제거
5. eyebrow에 Earth 로고 표시 (`showLogo` prop)
6. 빈 상태에서 Earth 캐릭터 표시

변경 사항 (전체 파일 교체하지 말고 diff로 수정):

**import 추가** (파일 상단):
```tsx
import { CharacterAvatar } from '@/components/character-avatar';
import { NomadTypes } from '@/constants/nomad-types';
import type { NomadType, Post } from '@/types/api';
```

**ScreenShell에 `showLogo` 추가:**
```tsx
<ScreenShell
  eyebrow="NNAI Nomad"
  invertEyebrow
  showLogo
  title={t('오늘의 출근 도장', "Today's check-in")}
  ...
```

**"새 글 쓰기" 버튼 — radius 0:**
```tsx
<Pressable
  style={{
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.backgroundSelected,
    paddingHorizontal: 16,
    paddingVertical: 8,
  }}
  onPress={() => router.push('/compose')}>
```

**FlipPostCard 수정 — 카드 앞면:**
- `borderRadius: 16` → `borderRadius: 0` (앞면, 뒷면 모두)
- 기존 이미지 오버레이 대신 캐릭터 아이콘 + 제목 + 타입 라벨 레이아웃
- `post.author_nomad_type` 사용

앞면 내부를 다음으로 교체:
```tsx
{/* Front — character + title */}
<View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
  <View style={{ alignItems: 'center' }}>
    <CharacterAvatar type={post.author_nomad_type} size={64} />
  </View>
  <View style={{ gap: 4 }}>
    <ThemedText style={{ fontSize: 11, fontWeight: '700' }} numberOfLines={2}>
      {post.title}
    </ThemedText>
    <ThemedText
      style={{
        fontSize: 9,
        fontWeight: '700',
        color: NomadTypes[post.author_nomad_type]?.color ?? theme.accent,
      }}>
      {NomadTypes[post.author_nomad_type]?.label ?? post.author_nomad_type}
    </ThemedText>
  </View>
</View>
```

뒷면도 `borderRadius: 0`으로, 태그의 `rounded-full` → 직각 스타일로.

카드 좌측 보더에 타입 color 적용:
```tsx
borderLeftWidth: 3,
borderLeftColor: NomadTypes[post.author_nomad_type]?.color ?? theme.border,
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(tabs\)/index.tsx
git commit -m "feat: reskin feed flip cards with character avatars and retro style"
```

---

## Task 12: 최종 정리 & 검증

**Files:**
- Verify all files compile and run

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`

모든 에러를 수정한다. 주로 예상되는 에러:
- `author_nomad_type` 가 기존 코드에서 사용되지 않던 곳 (Post 타입 변경으로 인한)
- `nomad_type`이 User에 추가되면서 기존 로그인 코드에서 필드 누락

- [ ] **Step 2: lint 체크**

Run: `npx expo lint`

- [ ] **Step 3: 앱 실행 확인**

Run: `npx expo start --clear`

시뮬레이터에서 확인할 사항:
1. Earth 로딩 화면이 표시되는지
2. 로그인 후 3탭(피드/도시/나)이 보이는지
3. 피드 플립카드에 캐릭터 아이콘이 표시되는지
4. 도시 탭에 추천+전체+서클이 통합되어 있는지
5. 나 탭에 캐릭터 프로필+스탯+계획이 있는지
6. 플로팅 동반자가 우하단에 표시되는지
7. 탭 전환 시 말풍선이 나타나는지

- [ ] **Step 4: `.gitignore`에 `.superpowers/` 추가**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat: complete character-centric redesign with 3-tab layout, floating companion, and retro pixel style"
```

---

## Dependency Notes for Codex

- **테스트 프레임워크가 없음** — 이 프로젝트에는 Jest/Vitest가 설정되어 있지 않으므로, TDD 스텝은 생략하고 `npx tsc --noEmit`과 `npx expo lint`로 검증한다.
- **Mock API 모드** — `EXPO_PUBLIC_DEV_MOCK_API=true`로 설정하면 백엔드 없이 개발 가능. `.env`에 이미 설정되어 있을 수 있음.
- **이미지 에셋** — `resources/character/` 디렉토리에 이미 모든 에셋이 있음. `require()`로 번들에 포함됨.
- **expo-image** — gif 렌더링을 기본 지원. `contentFit: 'contain'`으로 비율 유지.
- **Reanimated** — 이미 설치되어 있음 (`react-native-reanimated` 4.2.1). `babel.config.js`에 플러그인 설정 확인 필요.
- **파일 삭제 시 주의** — expo-router는 파일 기반 라우팅이므로, `discover.tsx`, `plans.tsx`, `profile.tsx` 삭제 후 반드시 `city.tsx`, `me.tsx`가 존재해야 함. 동시에 처리할 것.
