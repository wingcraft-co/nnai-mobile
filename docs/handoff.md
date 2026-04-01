# 인수인계 문서 — NNAI Mobile Integration

> 작성일: 2026-04-01  
> 작성자: Claude Code (Sonnet 4.6)  
> 인수자: Codex

---

## 프로젝트 개요

**NNAI Nomad Mobile** — 디지털 노마드 커뮤니티 앱  
- 레포: `nnai-mobile` (현재 레포)
- 기술 스택: Expo 55 + React Native 0.83 + TypeScript strict
- 연결 백엔드: `https://api.nnai.app` (Python/FastAPI, Railway)

---

## 현재 상태

### 브랜치
```
main                    — 완성된 설계 문서, 계획 문서 포함
feat/mobile-integration — 현재 작업 브랜치 (여기서 계속 작업)
```

### 완료된 작업
1. 설계 문서 작성 완료 → `docs/superpowers/specs/2026-04-01-nnai-mobile-design.md`
2. 구현 계획 작성 완료 → `docs/superpowers/plans/2026-04-01-nnai-mobile-integration.md`
3. 백엔드 가이드 작성 완료 → `docs/backend-mobile-integration.md`
4. 브랜치 생성: `feat/mobile-integration`

### 아직 안 된 작업
- **백엔드 (nnai 레포)**: 사용자가 직접 작업 중 → `docs/backend-mobile-integration.md` 참고
- **모바일 앱 (이 레포)**: Part B Task 8–16 전부 미구현

---

## 지금 해야 할 일

`feat/mobile-integration` 브랜치에서 아래 태스크를 순서대로 구현한다.

### Task 8: 의존성 설치 + 타입 정의

```bash
npx expo install expo-auth-session expo-secure-store expo-crypto
```

생성 파일: `src/types/api.ts`

```typescript
export type User = {
  uid: string;
  name: string;
  picture: string;
  email?: string;
};

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
};

export type Comment = {
  id: number;
  user_id: string;
  author: string;
  picture: string;
  body: string;
  created_at: string;
};

export type City = {
  city_id: string;
  city: string;
  city_kr: string | null;
  country: string | null;
  country_id: string;
  monthly_cost_usd: number | null;
  internet_mbps: number | null;
  safety_score: number | null;
  english_score: number | null;
  nomad_score: number | null;
};

export type Circle = {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  joined: boolean;
};

export type Pin = {
  id: number;
  city: string;
  display: string | null;
  note: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

export type ChecklistItem = {
  id: number;
  text: string;
  is_done: boolean;
  sort_order: number;
};

export type MovePlan = {
  id: number;
  title: string;
  from_city: string | null;
  to_city: string | null;
  stage: 'planning' | 'booked' | 'completed';
  created_at: string;
  checklist: ChecklistItem[];
};

export type Profile = {
  uid: string;
  name: string;
  picture: string;
  email: string;
  badges: string[];
  stats: {
    pins: number;
    posts: number;
    circles: number;
  };
};
```

커밋: `feat: add API types and install auth/secure-store deps`

---

### Task 9: API 클라이언트

생성 파일: `src/api/client.ts`

```typescript
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://api.nnai.app';
const JWT_KEY = 'nnai_jwt';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function saveToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(JWT_KEY, token);
}

export async function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(JWT_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

커밋: `feat: add API client with JWT handling`

---

### Task 10: 인증 스토어 + API 모듈 6개

생성 파일 목록:
- `src/store/auth-store.ts`
- `src/api/auth.ts`
- `src/api/posts.ts`
- `src/api/cities.ts`
- `src/api/circles.ts`
- `src/api/moves.ts`
- `src/api/profile.ts`

**`src/store/auth-store.ts`:**

```typescript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getToken, clearToken } from '@/api/client';
import type { User } from '@/types/api';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; token: string; user: User };

type AuthAction =
  | { type: 'LOADED_NO_TOKEN' }
  | { type: 'LOGIN'; token: string; user: User }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADED_NO_TOKEN': return { status: 'unauthenticated' };
    case 'LOGIN': return { status: 'authenticated', token: action.token, user: action.user };
    case 'LOGOUT': return { status: 'unauthenticated' };
  }
}

type AuthContextValue = {
  state: AuthState;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'loading' });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { dispatch({ type: 'LOADED_NO_TOKEN' }); return; }
      try {
        const { fetchMe } = await import('@/api/auth');
        const user = await fetchMe();
        dispatch({ type: 'LOGIN', token, user });
      } catch {
        await clearToken();
        dispatch({ type: 'LOADED_NO_TOKEN' });
      }
    })();
  }, []);

  const login = (token: string, user: User) => dispatch({ type: 'LOGIN', token, user });
  const logout = async () => { await clearToken(); dispatch({ type: 'LOGOUT' }); };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**`src/api/auth.ts`:**
```typescript
import { apiRequest, saveToken } from './client';
import type { User } from '@/types/api';

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ token: string; user: User }> {
  return apiRequest('/auth/mobile/token', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
}

export async function fetchMe(): Promise<User> {
  return apiRequest('/auth/mobile/me');
}
```

**`src/api/posts.ts`:**
```typescript
import { apiRequest } from './client';
import type { Post, Comment } from '@/types/api';

export const fetchPosts = (page = 0): Promise<Post[]> =>
  apiRequest(`/api/mobile/posts?limit=20&offset=${page * 20}`);

export const createPost = (data: {
  title: string; body: string; tags: string[]; city: string | null;
}): Promise<Post> =>
  apiRequest('/api/mobile/posts', { method: 'POST', body: JSON.stringify(data) });

export const toggleLike = (postId: number): Promise<{ liked: boolean }> =>
  apiRequest(`/api/mobile/posts/${postId}/like`, { method: 'POST' });

export const fetchComments = (postId: number): Promise<Comment[]> =>
  apiRequest(`/api/mobile/posts/${postId}/comments`);

export const createComment = (postId: number, body: string): Promise<Comment> =>
  apiRequest(`/api/mobile/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
```

**`src/api/cities.ts`:**
```typescript
import { apiRequest } from './client';
import type { City, Pin } from '@/types/api';

export const fetchCities = (): Promise<City[]> => apiRequest('/api/mobile/cities');
export const fetchCity = (cityId: string): Promise<City> => apiRequest(`/api/mobile/cities/${cityId}`);
export const fetchPins = (): Promise<Pin[]> => apiRequest('/api/mobile/pins');
export const createPin = (data: {
  city: string; display: string; note: string; lat: number; lng: number;
}): Promise<Pin> =>
  apiRequest('/api/mobile/pins', { method: 'POST', body: JSON.stringify(data) });
```

**`src/api/circles.ts`:**
```typescript
import { apiRequest } from './client';
import type { Circle } from '@/types/api';

export const fetchCircles = (): Promise<Circle[]> => apiRequest('/api/mobile/circles');
export const toggleCircleMembership = (circleId: number): Promise<{ joined: boolean }> =>
  apiRequest(`/api/mobile/circles/${circleId}/join`, { method: 'POST' });
```

**`src/api/moves.ts`:**
```typescript
import { apiRequest } from './client';
import type { MovePlan, ChecklistItem } from '@/types/api';

export const fetchMoves = (): Promise<MovePlan[]> => apiRequest('/api/mobile/moves');
export const createMove = (data: {
  title: string; from_city?: string; to_city?: string; checklist?: string[];
}): Promise<MovePlan> =>
  apiRequest('/api/mobile/moves', { method: 'POST', body: JSON.stringify(data) });
export const patchMoveStage = (moveId: number, stage: MovePlan['stage']): Promise<MovePlan> =>
  apiRequest(`/api/mobile/moves/${moveId}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
export const deleteMove = (moveId: number): Promise<void> =>
  apiRequest(`/api/mobile/moves/${moveId}`, { method: 'DELETE' });
export const toggleChecklistItem = (moveId: number, itemId: number): Promise<ChecklistItem> =>
  apiRequest(`/api/mobile/moves/${moveId}/items/${itemId}`, { method: 'PATCH' });
```

**`src/api/profile.ts`:**
```typescript
import { apiRequest } from './client';
import type { Profile } from '@/types/api';

export const fetchProfile = (): Promise<Profile> => apiRequest('/api/mobile/profile');
```

커밋: `feat: add auth store and API modules`

---

### Task 11: 로그인 화면

생성 파일:
- `src/app/(auth)/_layout.tsx`
- `src/app/(auth)/login.tsx`

**`src/app/(auth)/_layout.tsx`:**
```typescript
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**`src/app/(auth)/login.tsx`:**
```typescript
import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { exchangeCodeForToken } from '@/api/auth';
import { saveToken } from '@/api/client';
import { useAuth } from '@/store/auth-store';
import { Spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

// Google Cloud Console에서 발급받은 클라이언트 ID로 교체 필요
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      const redirectUri = AuthSession.makeRedirectUri();
      setLoading(true);
      exchangeCodeForToken(code, redirectUri)
        .then(async ({ token, user }) => {
          await saveToken(token);
          login(token, user);
          router.replace('/(tabs)');
        })
        .catch((e) => setError(e.message ?? '로그인에 실패했습니다.'))
        .finally(() => setLoading(false));
    }
  }, [response]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>NNAI Nomad</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          디지털 노마드를 위한 소셜 레이어
        </ThemedText>
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => promptAsync()}
          disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <ThemedText style={styles.buttonText}>Google로 계속하기</ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 36, fontWeight: '700' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  error: { fontSize: 14, color: '#e53e3e', textAlign: 'center' },
  button: { width: '100%', padding: Spacing.three, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

커밋: `feat: add login screen with Google OAuth`

---

### Task 12: 루트 레이아웃 수정

수정 파일: `src/app/_layout.tsx`

기존 파일을 읽고, `AuthProvider` 래핑 + 인증 라우팅 로직을 추가한다.
기존 폰트 로딩(`useFonts`), SplashScreen, StatusBar 코드는 그대로 유지.

추가할 내용:
1. `AuthProvider`로 전체 앱 감싸기
2. `useAuth`로 인증 상태 읽기
3. `unauthenticated` → `/(auth)/login` 리다이렉트
4. `authenticated` + auth 그룹에 있으면 → `/(tabs)` 리다이렉트
5. `loading` 상태에서는 SplashScreen 유지

```typescript
// 기존 import들 아래에 추가
import { AuthProvider, useAuth } from '@/store/auth-store';

// RootLayoutNav 컴포넌트를 새로 만들어서 기존 Stack 래핑
function RootLayoutNav() {
  const { state } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (state.status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (state.status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (state.status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'loading') SplashScreen.hideAsync();
  }, [state.status]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

// 기존 export default 함수에서 AuthProvider로 감싸기
export default function RootLayout() {
  // ... 기존 폰트 로딩 코드 유지 ...
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
```

커밋: `feat: add auth routing to root layout`

---

### Task 13: Feed 탭 API 연결

수정 파일: `src/app/index.tsx`  
수정 파일: `src/components/screen-shell.tsx` (refreshControl prop 추가)

**screen-shell.tsx 수정 — refreshControl prop 추가:**
```typescript
// ScreenShellProps에 추가
refreshControl?: React.ReactElement;

// ScrollView에 전달
<ScrollView refreshControl={refreshControl} ...>
```

**index.tsx — mock 데이터 제거, API 연결:**
- `featuredPosts`, `nomadSnapshot` import 제거
- `fetchPosts`, `toggleLike` from `@/api/posts` 사용
- `useState<Post[]>([])`, `useEffect`로 로드
- RefreshControl 추가
- 좋아요 버튼 Pressable로 처리

커밋: `feat: connect Feed tab to real API`

---

### Task 14: Discover 탭 API 연결

수정 파일: `src/app/discover.tsx`
- `cityRadar`, `circles` mock import 제거
- `fetchCities` from `@/api/cities` 사용
- `fetchCircles`, `toggleCircleMembership` from `@/api/circles` 사용
- 서클 가입 버튼 추가

커밋: `feat: connect Discover tab to real API`

---

### Task 15: Plans 탭 API 연결

수정 파일: `src/app/plans.tsx`
- `moveBoard`, `stayPlaybook` mock import 제거
- `fetchMoves`, `toggleChecklistItem` from `@/api/moves` 사용
- 체크리스트 항목 Pressable로 처리 (완료 토글)

커밋: `feat: connect Plans tab to real API`

---

### Task 16: Profile 탭 + mock 데이터 정리

수정 파일: `src/app/profile.tsx`
- `profileSummary` mock import 제거
- `fetchProfile` from `@/api/profile` 사용
- `useAuth`에서 `logout` 가져와 로그아웃 버튼 추가

수정 파일: `src/data/mock.ts`
- 탭 화면이 사용하던 export 모두 제거 (`featuredPosts`, `nomadSnapshot`, `cityRadar`, `circles`, `moveBoard`, `stayPlaybook`, `profileSummary`)
- 파일이 비면 삭제

커밋: `feat: connect Profile tab to real API, remove mock data`

---

## 파일 구조 (완성 후)

```
src/
├── api/
│   ├── client.ts
│   ├── auth.ts
│   ├── posts.ts
│   ├── cities.ts
│   ├── circles.ts
│   ├── moves.ts
│   └── profile.ts
├── store/
│   └── auth-store.ts
├── types/
│   └── api.ts
├── app/
│   ├── _layout.tsx          ← AuthProvider + 인증 라우팅 추가
│   ├── (auth)/
│   │   ├── _layout.tsx      ← 신규
│   │   └── login.tsx        ← 신규
│   └── (tabs)/
│       ├── index.tsx        ← API 연결
│       ├── discover.tsx     ← API 연결
│       ├── plans.tsx        ← API 연결
│       └── profile.tsx      ← API 연결
└── components/
    └── screen-shell.tsx     ← refreshControl prop 추가
```

---

## 중요 전제 조건

**백엔드가 먼저 배포되어 있어야 한다.**  
`https://api.nnai.app/auth/mobile/me` 에 curl하면 `{"detail":"Bearer token required"}` (401)이 돌아와야 모바일 앱 작업을 시작할 수 있다.

백엔드 작업 가이드: `docs/backend-mobile-integration.md`

---

## Google OAuth 클라이언트 ID 발급 (로그인 화면 작동 전 필수)

1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보
2. OAuth 2.0 클라이언트 ID 생성
   - iOS: 번들 ID = `app.json`의 `ios.bundleIdentifier`
   - Android: 패키지명 = `app.json`의 `android.package`
3. `src/app/(auth)/login.tsx`의 `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID` 교체

---

## 완료 기준

- [ ] `npm run ios` 실행 시 로그인 화면 표시
- [ ] Google 로그인 성공 후 탭 화면 진입
- [ ] Feed: 실제 포스트 목록 (또는 빈 상태)
- [ ] Discover: `verified_cities` 기반 실제 도시 목록
- [ ] Plans: 이동 계획 목록 (또는 빈 상태)
- [ ] Profile: 실제 유저 정보 + 로그아웃 버튼
- [ ] 로그아웃 후 로그인 화면으로 복귀
- [ ] `src/data/mock.ts`에 탭 화면용 mock import 없음
