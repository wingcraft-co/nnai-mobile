# NNAI Nomad Mobile

`nnai` 웹서비스를 모바일 앱으로 확장하기 위한 Expo + React Native 프로젝트입니다. 목표는 하나의 코드베이스로 Android/iOS를 함께 개발하고, 최종적으로 Google Play / App Store 배포까지 이어지는 구조를 확보하는 것입니다.

## 왜 이 스택인가

- `React Native` 공식 문서는 직접 네이티브 앱을 시작할 때 프레임워크 사용을 권장합니다.
- `Expo`는 최신 SDK, `expo-router`, EAS Build/Submit, OTA 업데이트 흐름을 제공해 크로스플랫폼 제품 개발과 스토어 배포 경로가 가장 안정적입니다.
- macOS(M4) 기준으로 iOS Simulator / Android Emulator / physical device 테스트 흐름을 함께 가져가기 좋습니다.

## 현재 구성

- `expo-router` 기반 파일 라우팅
- TypeScript strict mode
- 4개 핵심 탭
  - `Feed`: 디지털노마드 커뮤니티 피드
  - `Discover`: 도시/커뮤니티 탐색
  - `Moves`: 이동 및 체류 운영 보드
  - `Profile`: 신뢰 기반 프로필
- `eas.json` 포함
- iOS bundle id / Android package placeholder 설정 포함

## 실행

```bash
npm install
npm run ios
npm run android
npm run web
```

## 배포 전 필수 수정

`app.json`에서 아래 값은 실제 운영값으로 바꿔야 합니다.

- `expo.extra.eas.projectId`
- `ios.bundleIdentifier`
- `android.package`
- 앱명, 아이콘, 스플래시 자산

## 권장 다음 단계

1. Supabase 또는 Firebase 중 하나를 골라 인증, 프로필, 포스트, 댓글 데이터 모델을 붙입니다.
2. 이미지 업로드와 실시간 피드 갱신을 연결합니다.
3. `eas init` 후 production profile로 실제 스토어 빌드 파이프라인을 연결합니다.
4. App Store / Play Store 메타데이터, 개인정보처리방침, 계정 삭제 정책을 준비합니다.

## 참고한 최신 공식 가이드

- Expo getting started: https://docs.expo.dev/get-started/create-a-project/
- Expo Router: https://docs.expo.dev/router/introduction/
- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- React Native environment setup: https://reactnative.dev/docs/environment-setup
