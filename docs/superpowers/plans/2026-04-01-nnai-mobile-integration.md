# NNAI Mobile Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 nnai Python 백엔드에 모바일 전용 JWT 인증 + API를 추가하고, Expo 앱에서 mock 데이터를 실제 API로 교체한다.

**Architecture:** 기존 웹 인증(쿠키)과 모바일 인증(JWT Bearer)을 완전히 분리한다. 백엔드는 `/api/mobile/*` 네임스페이스에 모바일 전용 라우터를 추가하고, 모바일 앱은 `expo-secure-store`에 JWT를 저장해 모든 요청에 자동으로 첨부한다.

**Tech Stack:** Python(FastAPI) + PyJWT | Expo 55 + expo-auth-session + expo-secure-store + React Native 0.83

> **작업 레포 안내**
> - Part A (Task 1–8): `nnai` 백엔드 레포에서 작업
> - Part B (Task 9–16): `nnai-mobile` 레포에서 작업
> - Part A가 완료되고 `api.nnai.app`에 배포된 후 Part B를 시작한다

---

## 파일 구조 (변경 대상)

### Part A — nnai 백엔드 레포

```
migrations/
  001_mobile_tables.sql          # 신규 테이블 8개 생성

utils/
  mobile_auth.py                 # JWT 서명/검증 + require_mobile_auth 미들웨어

routers/
  mobile_auth.py                 # POST /auth/mobile/token, GET /auth/mobile/me
  mobile_feed.py                 # /api/mobile/posts/*
  mobile_discover.py             # /api/mobile/cities/*, /api/mobile/circles/*, /api/mobile/pins
  mobile_plans.py                # /api/mobile/moves/*
  mobile_profile.py              # GET /api/mobile/profile
  mobile_recommend.py            # POST /api/mobile/recommend, /api/mobile/detail

main.py (수정)                   # 6개 라우터 include 추가

tests/
  test_mobile_auth.py
  test_mobile_feed.py
  test_mobile_discover.py
  test_mobile_plans.py
  test_mobile_profile.py
  test_mobile_recommend.py
```

### Part B — nnai-mobile 레포

```
src/
  api/
    client.ts                    # fetch 래퍼 (baseURL, Bearer 헤더 자동 주입, 401 처리)
    auth.ts                      # /auth/mobile/* 호출 함수
    posts.ts                     # /api/mobile/posts 호출 함수
    cities.ts                    # /api/mobile/cities, /api/mobile/pins 호출 함수
    circles.ts                   # /api/mobile/circles 호출 함수
    moves.ts                     # /api/mobile/moves 호출 함수
    profile.ts                   # /api/mobile/profile 호출 함수
  store/
    auth-store.ts                # JWT + User 전역 상태 (Context + useReducer)
  app/
    _layout.tsx (수정)           # 인증 상태에 따른 라우팅 추가
    (auth)/
      _layout.tsx                # auth 그룹 레이아웃
      login.tsx                  # Google 로그인 화면
    (tabs)/
      index.tsx (수정)           # Feed: mock → API
      discover.tsx (수정)        # Discover: mock → API
      plans.tsx (수정)           # Plans: mock → API
      profile.tsx (수정)         # Profile: mock → API
  types/
    api.ts                       # API 응답 타입 정의
```

---

## Part A — 백엔드 (nnai 레포)

### Task 1: DB 마이그레이션

**Files:**
- Create: `migrations/001_mobile_tables.sql`

- [ ] **Step 1: SQL 파일 생성**

```sql
-- migrations/001_mobile_tables.sql

-- Feed
CREATE TABLE IF NOT EXISTS posts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    tags        JSONB NOT NULL DEFAULT '[]',
    city        TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discover
CREATE TABLE IF NOT EXISTS circles (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circle_members (
    circle_id   BIGINT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (circle_id, user_id)
);

-- Plans
CREATE TABLE IF NOT EXISTS move_plans (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    title       TEXT NOT NULL,
    from_city   TEXT,
    to_city     TEXT,
    stage       TEXT NOT NULL DEFAULT 'planning'
                CHECK (stage IN ('planning', 'booked', 'completed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS move_checklist_items (
    id          BIGSERIAL PRIMARY KEY,
    plan_id     BIGINT NOT NULL REFERENCES move_plans(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Profile
CREATE TABLE IF NOT EXISTS user_badges (
    user_id     TEXT NOT NULL REFERENCES users(id),
    badge       TEXT NOT NULL
                CHECK (badge IN ('host', 'verified_reviewer', 'community_builder')),
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge)
);
```

- [ ] **Step 2: 마이그레이션 실행**

```bash
# Railway DB에 직접 실행 (DATABASE_URL은 Railway 대시보드에서 확인)
psql $DATABASE_URL -f migrations/001_mobile_tables.sql
```

Expected output:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

- [ ] **Step 3: 테이블 생성 확인**

```bash
psql $DATABASE_URL -c "\dt"
```

Expected: `posts`, `post_likes`, `post_comments`, `circles`, `circle_members`, `move_plans`, `move_checklist_items`, `user_badges` 포함되어 있음

- [ ] **Step 4: 커밋**

```bash
git add migrations/001_mobile_tables.sql
git commit -m "feat: add mobile tables migration"
```

---

### Task 2: JWT 유틸리티 + 모바일 인증 미들웨어

**Files:**
- Create: `utils/mobile_auth.py`
- Modify: `requirements.txt` (PyJWT 추가)

- [ ] **Step 1: 의존성 추가**

`requirements.txt`에 추가:
```
PyJWT>=2.8.0
```

```bash
pip install PyJWT>=2.8.0
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/test_mobile_auth.py`:
```python
import pytest
import time
from utils.mobile_auth import create_jwt, decode_jwt, MobileAuthError

def test_create_and_decode_jwt():
    token = create_jwt(user_id="test_user_123")
    payload = decode_jwt(token)
    assert payload["uid"] == "test_user_123"

def test_decode_invalid_token_raises():
    with pytest.raises(MobileAuthError):
        decode_jwt("invalid.token.here")

def test_decode_expired_token_raises():
    token = create_jwt(user_id="test_user", expires_in_seconds=1)
    time.sleep(2)
    with pytest.raises(MobileAuthError):
        decode_jwt(token)
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
pytest tests/test_mobile_auth.py -v
```

Expected: `ImportError: cannot import name 'create_jwt'`

- [ ] **Step 4: 구현**

`utils/mobile_auth.py`:
```python
import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException

JWT_SECRET = os.environ["JWT_SECRET"]  # 환경변수에서 로드
JWT_ALGORITHM = "HS256"


class MobileAuthError(Exception):
    pass


def create_jwt(user_id: str, expires_in_seconds: int = 86400) -> str:
    payload = {
        "uid": user_id,
        "exp": datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in_seconds),
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise MobileAuthError("Token expired")
    except jwt.InvalidTokenError:
        raise MobileAuthError("Invalid token")


def require_mobile_auth(request: Request) -> str:
    """FastAPI dependency — JWT에서 user_id를 반환한다."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    token = auth_header.removeprefix("Bearer ")
    try:
        payload = decode_jwt(token)
        return payload["uid"]
    except MobileAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_auth.py -v
```

Expected: 3 PASSED

- [ ] **Step 6: 환경변수 설정**

Railway 대시보드 → nnai 서비스 → Variables에 추가:
```
JWT_SECRET=<32자 이상의 랜덤 문자열>
```

로컬 `.env` 파일에도 추가 (`.gitignore`에 있는지 확인):
```
JWT_SECRET=local_dev_secret_change_in_prod
```

- [ ] **Step 7: 커밋**

```bash
git add utils/mobile_auth.py tests/test_mobile_auth.py requirements.txt
git commit -m "feat: add JWT utilities and mobile auth middleware"
```

---

### Task 3: 모바일 인증 엔드포인트

**Files:**
- Create: `routers/mobile_auth.py`
- Modify: `main.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_mobile_auth_routes.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_mobile_token_missing_code_returns_422():
    res = client.post("/auth/mobile/token", json={})
    assert res.status_code == 422

def test_mobile_me_without_token_returns_401():
    res = client.get("/auth/mobile/me")
    assert res.status_code == 401

def test_mobile_me_with_valid_token_returns_user(monkeypatch):
    from utils.mobile_auth import create_jwt
    token = create_jwt("google_sub_123")

    # DB에 유저가 있다고 가정
    mock_user = {"id": "google_sub_123", "name": "Test User", "picture": "https://example.com/pic.jpg"}
    with patch("routers.mobile_auth.get_user_by_id", return_value=mock_user):
        res = client.get("/auth/mobile/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["uid"] == "google_sub_123"
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_mobile_auth_routes.py -v
```

Expected: `ImportError` 또는 `404`

- [ ] **Step 3: 라우터 구현**

`routers/mobile_auth.py`:
```python
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from utils.mobile_auth import create_jwt, require_mobile_auth
from utils.db import get_conn

router = APIRouter(prefix="/auth/mobile", tags=["mobile-auth"])

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]


class TokenRequest(BaseModel):
    code: str
    redirect_uri: str


def get_user_by_id(user_id: str) -> dict | None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, picture FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "picture": row[2]}


@router.post("/token")
async def mobile_token(body: TokenRequest):
    # Google에 code 교환
    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data={
            "code": body.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": body.redirect_uri,
            "grant_type": "authorization_code",
        })
    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Google OAuth failed")

    access_token = token_res.json()["access_token"]

    # 유저 정보 조회
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    info = userinfo_res.json()
    user_id = info["sub"]

    # DB upsert
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (id, email, name, picture, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email,
                name = EXCLUDED.name,
                picture = EXCLUDED.picture
    """, (user_id, info.get("email"), info.get("name"), info.get("picture")))
    conn.commit()

    jwt_token = create_jwt(user_id)
    return {
        "token": jwt_token,
        "user": {"uid": user_id, "name": info.get("name"), "picture": info.get("picture")},
    }


@router.get("/me")
def mobile_me(user_id: str = Depends(require_mobile_auth)):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"uid": user["id"], "name": user["name"], "picture": user["picture"]}
```

- [ ] **Step 4: main.py에 라우터 등록**

`main.py`에서 아래 패턴으로 라우터 추가 (기존 라우터 등록 코드 옆에):
```python
from routers.mobile_auth import router as mobile_auth_router
app.include_router(mobile_auth_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_auth_routes.py -v
```

Expected: 3 PASSED

- [ ] **Step 6: 커밋**

```bash
git add routers/mobile_auth.py tests/test_mobile_auth_routes.py main.py
git commit -m "feat: add mobile auth endpoints (token + me)"
```

---

### Task 4: Feed API

**Files:**
- Create: `routers/mobile_feed.py`
- Create: `tests/test_mobile_feed.py`
- Modify: `main.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_mobile_feed.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from utils.mobile_auth import create_jwt

client = TestClient(app)

def auth_header(user_id="test_user"):
    return {"Authorization": f"Bearer {create_jwt(user_id)}"}

def test_get_posts_without_auth_returns_401():
    res = client.get("/api/mobile/posts")
    assert res.status_code == 401

def test_get_posts_returns_list():
    res = client.get("/api/mobile/posts", headers=auth_header())
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_create_post_returns_created_post():
    res = client.post("/api/mobile/posts", headers=auth_header(), json={
        "title": "Test post",
        "body": "Test body",
        "tags": ["test"],
        "city": "Seoul",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Test post"
    assert "id" in data

def test_like_post_toggles():
    # 포스트 생성
    create_res = client.post("/api/mobile/posts", headers=auth_header(), json={
        "title": "Like test", "body": "body", "tags": [], "city": None,
    })
    post_id = create_res.json()["id"]

    # 좋아요
    like_res = client.post(f"/api/mobile/posts/{post_id}/like", headers=auth_header())
    assert like_res.status_code == 200
    assert like_res.json()["liked"] is True

    # 좋아요 취소
    unlike_res = client.post(f"/api/mobile/posts/{post_id}/like", headers=auth_header())
    assert unlike_res.json()["liked"] is False
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_mobile_feed.py -v
```

Expected: 4 FAILED (404)

- [ ] **Step 3: 구현**

`routers/mobile_feed.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.mobile_auth import require_mobile_auth
from utils.db import get_conn

router = APIRouter(prefix="/api/mobile", tags=["mobile-feed"])


class PostCreate(BaseModel):
    title: str
    body: str
    tags: list[str] = []
    city: Optional[str] = None


class CommentCreate(BaseModel):
    body: str


@router.get("/posts")
def get_posts(
    limit: int = 20,
    offset: int = 0,
    user_id: str = Depends(require_mobile_auth),
):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.user_id, u.name, u.picture,
               p.title, p.body, p.tags, p.city, p.likes_count, p.created_at,
               EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = %s) AS liked
        FROM posts p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset))
    rows = cur.fetchall()
    return [
        {
            "id": r[0], "user_id": r[1], "author": r[2], "picture": r[3],
            "title": r[4], "body": r[5], "tags": r[6], "city": r[7],
            "likes_count": r[8], "created_at": str(r[9]), "liked": r[10],
        }
        for r in rows
    ]


@router.post("/posts", status_code=201)
def create_post(body: PostCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    import json
    cur.execute("""
        INSERT INTO posts (user_id, title, body, tags, city)
        VALUES (%s, %s, %s, %s::jsonb, %s)
        RETURNING id, title, body, tags, city, likes_count, created_at
    """, (user_id, body.title, body.body, json.dumps(body.tags), body.city))
    conn.commit()
    r = cur.fetchone()
    return {
        "id": r[0], "title": r[1], "body": r[2],
        "tags": r[3], "city": r[4], "likes_count": r[5], "created_at": str(r[6]),
    }


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM post_likes WHERE post_id = %s AND user_id = %s",
        (post_id, user_id),
    )
    already_liked = cur.fetchone() is not None
    if already_liked:
        cur.execute(
            "DELETE FROM post_likes WHERE post_id = %s AND user_id = %s",
            (post_id, user_id),
        )
        cur.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id = %s", (post_id,))
        conn.commit()
        return {"liked": False}
    else:
        cur.execute(
            "INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)",
            (post_id, user_id),
        )
        cur.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = %s", (post_id,))
        conn.commit()
        return {"liked": True}


@router.get("/posts/{post_id}/comments")
def get_comments(post_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.user_id, u.name, u.picture, c.body, c.created_at
        FROM post_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
    """, (post_id,))
    rows = cur.fetchall()
    return [
        {"id": r[0], "user_id": r[1], "author": r[2], "picture": r[3],
         "body": r[4], "created_at": str(r[5])}
        for r in rows
    ]


@router.post("/posts/{post_id}/comments", status_code=201)
def create_comment(post_id: int, body: CommentCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO post_comments (post_id, user_id, body)
        VALUES (%s, %s, %s)
        RETURNING id, body, created_at
    """, (post_id, user_id, body.body))
    conn.commit()
    r = cur.fetchone()
    return {"id": r[0], "body": r[1], "created_at": str(r[2])}
```

- [ ] **Step 4: main.py에 라우터 등록**

```python
from routers.mobile_feed import router as mobile_feed_router
app.include_router(mobile_feed_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_feed.py -v
```

Expected: 4 PASSED

- [ ] **Step 6: 커밋**

```bash
git add routers/mobile_feed.py tests/test_mobile_feed.py main.py
git commit -m "feat: add mobile feed API (posts + likes + comments)"
```

---

### Task 5: Discover API (도시 + 서클 + 핀)

**Files:**
- Create: `routers/mobile_discover.py`
- Create: `tests/test_mobile_discover.py`
- Modify: `main.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_mobile_discover.py`:
```python
from fastapi.testclient import TestClient
from main import app
from utils.mobile_auth import create_jwt

client = TestClient(app)

def auth_header():
    return {"Authorization": f"Bearer {create_jwt('test_user')}"}

def test_get_cities_returns_list():
    res = client.get("/api/mobile/cities", headers=auth_header())
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_circles_returns_list():
    res = client.get("/api/mobile/circles", headers=auth_header())
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_pins_returns_list():
    res = client.get("/api/mobile/pins", headers=auth_header())
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_cities_without_auth_returns_401():
    res = client.get("/api/mobile/cities")
    assert res.status_code == 401
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_mobile_discover.py -v
```

Expected: 4 FAILED

- [ ] **Step 3: 구현**

`routers/mobile_discover.py`:
```python
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.mobile_auth import require_mobile_auth
from utils.db import get_conn

router = APIRouter(prefix="/api/mobile", tags=["mobile-discover"])


class PinCreate(BaseModel):
    city: str
    display: str
    note: str
    lat: float
    lng: float
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None


@router.get("/cities")
def get_cities(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT city_id, city, city_kr, country, country_id,
               monthly_cost_usd, internet_mbps, safety_score,
               english_score, nomad_score
        FROM verified_cities
        WHERE is_verified = TRUE
        ORDER BY nomad_score DESC NULLS LAST
        LIMIT 50
    """)
    rows = cur.fetchall()
    return [
        {
            "city_id": r[0], "city": r[1], "city_kr": r[2], "country": r[3],
            "country_id": r[4], "monthly_cost_usd": r[5], "internet_mbps": r[6],
            "safety_score": r[7], "english_score": r[8], "nomad_score": r[9],
        }
        for r in rows
    ]


@router.get("/cities/{city_id}")
def get_city(city_id: str, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT city_id, city, city_kr, country, country_id,
               monthly_cost_usd, internet_mbps, safety_score,
               english_score, nomad_score, tax_residency_days, data_verified_date
        FROM verified_cities
        WHERE city_id = %s
    """, (city_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="City not found")
    return {
        "city_id": row[0], "city": row[1], "city_kr": row[2], "country": row[3],
        "country_id": row[4], "monthly_cost_usd": row[5], "internet_mbps": row[6],
        "safety_score": row[7], "english_score": row[8], "nomad_score": row[9],
        "tax_residency_days": row[10], "data_verified_date": row[11],
    }


@router.get("/circles")
def get_circles(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.name, c.description, c.member_count,
               EXISTS(SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = %s) AS joined
        FROM circles c
        ORDER BY c.member_count DESC
    """, (user_id,))
    rows = cur.fetchall()
    return [
        {"id": r[0], "name": r[1], "description": r[2],
         "member_count": r[3], "joined": r[4]}
        for r in rows
    ]


@router.post("/circles/{circle_id}/join")
def toggle_circle_membership(circle_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM circle_members WHERE circle_id = %s AND user_id = %s",
        (circle_id, user_id),
    )
    is_member = cur.fetchone() is not None
    if is_member:
        cur.execute(
            "DELETE FROM circle_members WHERE circle_id = %s AND user_id = %s",
            (circle_id, user_id),
        )
        cur.execute("UPDATE circles SET member_count = member_count - 1 WHERE id = %s", (circle_id,))
        conn.commit()
        return {"joined": False}
    else:
        cur.execute(
            "INSERT INTO circle_members (circle_id, user_id) VALUES (%s, %s)",
            (circle_id, user_id),
        )
        cur.execute("UPDATE circles SET member_count = member_count + 1 WHERE id = %s", (circle_id,))
        conn.commit()
        return {"joined": True}


@router.get("/pins")
def get_pins(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, city, display, note, lat, lng, created_at
        FROM pins
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    return [
        {"id": r[0], "city": r[1], "display": r[2], "note": r[3],
         "lat": r[4], "lng": r[5], "created_at": str(r[6])}
        for r in rows
    ]


@router.post("/pins", status_code=201)
def create_pin(body: PinCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO pins (user_id, city, display, note, lat, lng, user_lat, user_lng, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id, city, created_at
    """, (user_id, body.city, body.display, body.note,
          body.lat, body.lng, body.user_lat, body.user_lng))
    conn.commit()
    r = cur.fetchone()
    return {"id": r[0], "city": r[1], "created_at": str(r[2])}
```

- [ ] **Step 4: main.py에 라우터 등록**

```python
from routers.mobile_discover import router as mobile_discover_router
app.include_router(mobile_discover_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_discover.py -v
```

Expected: 4 PASSED

- [ ] **Step 6: 커밋**

```bash
git add routers/mobile_discover.py tests/test_mobile_discover.py main.py
git commit -m "feat: add mobile discover API (cities + circles + pins)"
```

---

### Task 6: Plans API

**Files:**
- Create: `routers/mobile_plans.py`
- Create: `tests/test_mobile_plans.py`
- Modify: `main.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_mobile_plans.py`:
```python
from fastapi.testclient import TestClient
from main import app
from utils.mobile_auth import create_jwt

client = TestClient(app)

def auth_header():
    return {"Authorization": f"Bearer {create_jwt('test_user')}"}

def test_get_moves_returns_list():
    res = client.get("/api/mobile/moves", headers=auth_header())
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_create_move_returns_plan():
    res = client.post("/api/mobile/moves", headers=auth_header(), json={
        "title": "Seoul -> Lisbon",
        "from_city": "Seoul",
        "to_city": "Lisbon",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Seoul -> Lisbon"
    assert data["stage"] == "planning"
    assert "id" in data

def test_patch_move_stage():
    create_res = client.post("/api/mobile/moves", headers=auth_header(), json={
        "title": "Stage test", "from_city": "A", "to_city": "B",
    })
    move_id = create_res.json()["id"]
    patch_res = client.patch(
        f"/api/mobile/moves/{move_id}",
        headers=auth_header(),
        json={"stage": "booked"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["stage"] == "booked"

def test_toggle_checklist_item():
    create_res = client.post("/api/mobile/moves", headers=auth_header(), json={
        "title": "Checklist test", "from_city": "A", "to_city": "B",
        "checklist": ["Book flights", "Find housing"],
    })
    move_id = create_res.json()["id"]
    items = create_res.json()["checklist"]
    item_id = items[0]["id"]

    toggle_res = client.patch(
        f"/api/mobile/moves/{move_id}/items/{item_id}",
        headers=auth_header(),
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_done"] is True
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest tests/test_mobile_plans.py -v
```

Expected: 4 FAILED

- [ ] **Step 3: 구현**

`routers/mobile_plans.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.mobile_auth import require_mobile_auth
from utils.db import get_conn

router = APIRouter(prefix="/api/mobile", tags=["mobile-plans"])


class MoveCreate(BaseModel):
    title: str
    from_city: Optional[str] = None
    to_city: Optional[str] = None
    checklist: list[str] = []


class MovePatch(BaseModel):
    stage: str


def _get_checklist(cur, plan_id: int) -> list[dict]:
    cur.execute("""
        SELECT id, text, is_done, sort_order
        FROM move_checklist_items
        WHERE plan_id = %s
        ORDER BY sort_order ASC
    """, (plan_id,))
    return [{"id": r[0], "text": r[1], "is_done": r[2], "sort_order": r[3]}
            for r in cur.fetchall()]


@router.get("/moves")
def get_moves(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, from_city, to_city, stage, created_at
        FROM move_plans
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    result = []
    for r in rows:
        plan = {
            "id": r[0], "title": r[1], "from_city": r[2],
            "to_city": r[3], "stage": r[4], "created_at": str(r[5]),
            "checklist": _get_checklist(cur, r[0]),
        }
        result.append(plan)
    return result


@router.post("/moves", status_code=201)
def create_move(body: MoveCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO move_plans (user_id, title, from_city, to_city)
        VALUES (%s, %s, %s, %s)
        RETURNING id, title, from_city, to_city, stage, created_at
    """, (user_id, body.title, body.from_city, body.to_city))
    conn.commit()
    r = cur.fetchone()
    plan_id = r[0]

    for i, text in enumerate(body.checklist):
        cur.execute("""
            INSERT INTO move_checklist_items (plan_id, text, sort_order)
            VALUES (%s, %s, %s)
        """, (plan_id, text, i))
    conn.commit()

    return {
        "id": r[0], "title": r[1], "from_city": r[2], "to_city": r[3],
        "stage": r[4], "created_at": str(r[5]),
        "checklist": _get_checklist(cur, plan_id),
    }


@router.patch("/moves/{move_id}")
def patch_move(move_id: int, body: MovePatch, user_id: str = Depends(require_mobile_auth)):
    valid_stages = ("planning", "booked", "completed")
    if body.stage not in valid_stages:
        raise HTTPException(status_code=422, detail=f"stage must be one of {valid_stages}")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE move_plans SET stage = %s
        WHERE id = %s AND user_id = %s
        RETURNING id, title, stage
    """, (body.stage, move_id, user_id))
    conn.commit()
    r = cur.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Move plan not found")
    return {"id": r[0], "title": r[1], "stage": r[2]}


@router.delete("/moves/{move_id}", status_code=204)
def delete_move(move_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM move_plans WHERE id = %s AND user_id = %s RETURNING id",
        (move_id, user_id),
    )
    conn.commit()
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Move plan not found")


@router.patch("/moves/{move_id}/items/{item_id}")
def toggle_checklist_item(move_id: int, item_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    # 본인 plan인지 검증
    cur.execute("SELECT 1 FROM move_plans WHERE id = %s AND user_id = %s", (move_id, user_id))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Move plan not found")

    cur.execute("""
        UPDATE move_checklist_items SET is_done = NOT is_done
        WHERE id = %s AND plan_id = %s
        RETURNING id, text, is_done
    """, (item_id, move_id))
    conn.commit()
    r = cur.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {"id": r[0], "text": r[1], "is_done": r[2]}
```

- [ ] **Step 4: main.py에 라우터 등록**

```python
from routers.mobile_plans import router as mobile_plans_router
app.include_router(mobile_plans_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_plans.py -v
```

Expected: 4 PASSED

- [ ] **Step 6: 커밋**

```bash
git add routers/mobile_plans.py tests/test_mobile_plans.py main.py
git commit -m "feat: add mobile plans API (moves + checklist)"
```

---

### Task 7: Profile + Recommend API

**Files:**
- Create: `routers/mobile_profile.py`
- Create: `routers/mobile_recommend.py`
- Modify: `main.py`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/test_mobile_profile.py`:
```python
from fastapi.testclient import TestClient
from main import app
from utils.mobile_auth import create_jwt

client = TestClient(app)

def test_get_profile_without_auth_returns_401():
    res = client.get("/api/mobile/profile")
    assert res.status_code == 401

def test_get_profile_returns_user_data():
    token = create_jwt("test_user")
    res = client.get("/api/mobile/profile", headers={"Authorization": f"Bearer {token}"})
    # test_user가 DB에 없어도 404가 맞음
    assert res.status_code in (200, 404)
```

- [ ] **Step 2: 구현 — mobile_profile.py**

`routers/mobile_profile.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from utils.mobile_auth import require_mobile_auth
from utils.db import get_conn

router = APIRouter(prefix="/api/mobile", tags=["mobile-profile"])


@router.get("/profile")
def get_profile(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id, name, picture, email FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cur.execute("SELECT badge FROM user_badges WHERE user_id = %s", (user_id,))
    badges = [r[0] for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) FROM pins WHERE user_id = %s", (user_id,))
    pin_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM posts WHERE user_id = %s", (user_id,))
    post_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM circle_members WHERE user_id = %s", (user_id,))
    circle_count = cur.fetchone()[0]

    return {
        "uid": user[0],
        "name": user[1],
        "picture": user[2],
        "email": user[3],
        "badges": badges,
        "stats": {
            "pins": pin_count,
            "posts": post_count,
            "circles": circle_count,
        },
    }
```

- [ ] **Step 3: 구현 — mobile_recommend.py**

`routers/mobile_recommend.py`:
```python
from fastapi import APIRouter, Depends, Request
import httpx
from utils.mobile_auth import require_mobile_auth

router = APIRouter(prefix="/api/mobile", tags=["mobile-recommend"])

# 기존 /api/recommend, /api/detail 핸들러를 내부적으로 재사용한다.
# 실제 비즈니스 로직이 utils 또는 services 모듈에 있다면 그것을 직접 import해서 쓴다.
# 아래는 내부 호출 패턴 예시 (기존 핸들러 함수를 import하는 방식):

from routers.recommend import handle_recommend, handle_detail  # 기존 라우터의 내부 함수


@router.post("/recommend")
async def mobile_recommend(request: Request, user_id: str = Depends(require_mobile_auth)):
    body = await request.json()
    return await handle_recommend(body)


@router.post("/detail")
async def mobile_detail(request: Request, user_id: str = Depends(require_mobile_auth)):
    body = await request.json()
    return await handle_detail(body, user_id)
```

> **주의:** `handle_recommend`, `handle_detail`은 기존 `routers/recommend.py` 또는 해당 로직이 있는 파일에서 import한다. 기존 함수 시그니처를 확인하고 맞게 호출한다.

- [ ] **Step 4: main.py에 라우터 등록**

```python
from routers.mobile_profile import router as mobile_profile_router
from routers.mobile_recommend import router as mobile_recommend_router
app.include_router(mobile_profile_router)
app.include_router(mobile_recommend_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_mobile_profile.py -v
```

Expected: 2 PASSED

- [ ] **Step 6: 전체 백엔드 테스트 통과 확인**

```bash
pytest tests/ -v
```

Expected: 모든 테스트 PASSED

- [ ] **Step 7: Railway 배포 확인**

```bash
# Railway에 push하거나 CI/CD가 있다면 자동 배포됨
git push origin main

# 배포 후 헬스체크
curl https://api.nnai.app/auth/mobile/me
# Expected: {"detail": "Bearer token required"} (401)
```

- [ ] **Step 8: 커밋**

```bash
git add routers/mobile_profile.py routers/mobile_recommend.py tests/test_mobile_profile.py main.py
git commit -m "feat: add mobile profile and recommend API — backend complete"
```

---

## Part B — 모바일 앱 (nnai-mobile 레포)

> Part A의 모든 엔드포인트가 `api.nnai.app`에 배포된 후 시작한다.

### Task 8: 의존성 설치 + 타입 정의

**Files:**
- Modify: `package.json`
- Create: `src/types/api.ts`

- [ ] **Step 1: 패키지 설치**

```bash
npx expo install expo-auth-session expo-secure-store expo-crypto
```

- [ ] **Step 2: 타입 정의 작성**

`src/types/api.ts`:
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

- [ ] **Step 3: 커밋**

```bash
git add src/types/api.ts package.json package-lock.json
git commit -m "feat: add API types and install auth/secure-store deps"
```

---

### Task 9: API 클라이언트

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: 구현**

`src/api/client.ts`:
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
  constructor(
    public status: number,
    message: string,
  ) {
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

- [ ] **Step 2: 커밋**

```bash
git add src/api/client.ts
git commit -m "feat: add API client with JWT handling"
```

---

### Task 10: 인증 스토어 + 각 API 모듈

**Files:**
- Create: `src/store/auth-store.ts`
- Create: `src/api/auth.ts`
- Create: `src/api/posts.ts`
- Create: `src/api/cities.ts`
- Create: `src/api/circles.ts`
- Create: `src/api/moves.ts`
- Create: `src/api/profile.ts`

- [ ] **Step 1: 인증 스토어 구현**

`src/store/auth-store.ts`:
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
    case 'LOADED_NO_TOKEN':
      return { status: 'unauthenticated' };
    case 'LOGIN':
      return { status: 'authenticated', token: action.token, user: action.user };
    case 'LOGOUT':
      return { status: 'unauthenticated' };
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
      if (!token) {
        dispatch({ type: 'LOADED_NO_TOKEN' });
        return;
      }
      // 저장된 토큰으로 유저 정보 재검증
      try {
        const { fetchMe } = await import('@/api/auth');
        const user = await fetchMe();
        dispatch({ type: 'LOGIN', token, user });
      } catch {
        // 토큰 만료 또는 무효 → 삭제 후 로그인 화면으로
        await clearToken();
        dispatch({ type: 'LOADED_NO_TOKEN' });
      }
    })();
  }, []);

  const login = (token: string, user: User) => {
    dispatch({ type: 'LOGIN', token, user });
  };

  const logout = async () => {
    await clearToken();
    dispatch({ type: 'LOGOUT' });
  };

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

- [ ] **Step 2: API 모듈 구현**

`src/api/auth.ts`:
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

`src/api/posts.ts`:
```typescript
import { apiRequest } from './client';
import type { Post, Comment } from '@/types/api';

export const fetchPosts = (page = 0): Promise<Post[]> =>
  apiRequest(`/api/mobile/posts?limit=20&offset=${page * 20}`);

export const createPost = (data: {
  title: string;
  body: string;
  tags: string[];
  city: string | null;
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

`src/api/cities.ts`:
```typescript
import { apiRequest } from './client';
import type { City, Pin } from '@/types/api';

export const fetchCities = (): Promise<City[]> => apiRequest('/api/mobile/cities');

export const fetchCity = (cityId: string): Promise<City> =>
  apiRequest(`/api/mobile/cities/${cityId}`);

export const fetchPins = (): Promise<Pin[]> => apiRequest('/api/mobile/pins');

export const createPin = (data: {
  city: string;
  display: string;
  note: string;
  lat: number;
  lng: number;
}): Promise<Pin> =>
  apiRequest('/api/mobile/pins', { method: 'POST', body: JSON.stringify(data) });
```

`src/api/circles.ts`:
```typescript
import { apiRequest } from './client';
import type { Circle } from '@/types/api';

export const fetchCircles = (): Promise<Circle[]> => apiRequest('/api/mobile/circles');

export const toggleCircleMembership = (
  circleId: number,
): Promise<{ joined: boolean }> =>
  apiRequest(`/api/mobile/circles/${circleId}/join`, { method: 'POST' });
```

`src/api/moves.ts`:
```typescript
import { apiRequest } from './client';
import type { MovePlan, ChecklistItem } from '@/types/api';

export const fetchMoves = (): Promise<MovePlan[]> => apiRequest('/api/mobile/moves');

export const createMove = (data: {
  title: string;
  from_city?: string;
  to_city?: string;
  checklist?: string[];
}): Promise<MovePlan> =>
  apiRequest('/api/mobile/moves', { method: 'POST', body: JSON.stringify(data) });

export const patchMoveStage = (
  moveId: number,
  stage: 'planning' | 'booked' | 'completed',
): Promise<MovePlan> =>
  apiRequest(`/api/mobile/moves/${moveId}`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });

export const deleteMove = (moveId: number): Promise<void> =>
  apiRequest(`/api/mobile/moves/${moveId}`, { method: 'DELETE' });

export const toggleChecklistItem = (
  moveId: number,
  itemId: number,
): Promise<ChecklistItem> =>
  apiRequest(`/api/mobile/moves/${moveId}/items/${itemId}`, { method: 'PATCH' });
```

`src/api/profile.ts`:
```typescript
import { apiRequest } from './client';
import type { Profile } from '@/types/api';

export const fetchProfile = (): Promise<Profile> => apiRequest('/api/mobile/profile');
```

- [ ] **Step 3: 커밋**

```bash
git add src/store/auth-store.ts src/api/
git commit -m "feat: add auth store and API modules"
```

---

### Task 11: 로그인 화면

**Files:**
- Create: `src/app/(auth)/_layout.tsx`
- Create: `src/app/(auth)/login.tsx`

- [ ] **Step 1: auth 그룹 레이아웃**

`src/app/(auth)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: 로그인 화면 구현**

`src/app/(auth)/login.tsx`:
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
        .catch((e) => {
          setError(e.message ?? '로그인에 실패했습니다.');
        })
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

        {error && (
          <ThemedText style={[styles.error, { color: '#e53e3e' }]}>{error}</ThemedText>
        )}

        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => promptAsync()}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Google로 계속하기</ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 36, fontWeight: '700' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  error: { fontSize: 14, textAlign: 'center' },
  button: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login screen with Google OAuth"
```

---

### Task 12: 루트 레이아웃 — 인증 라우팅

**Files:**
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: 현재 파일 확인**

```bash
cat src/app/_layout.tsx
```

- [ ] **Step 2: 수정**

`src/app/_layout.tsx`에서 기존 내용을 유지하면서 `AuthProvider` 래핑과 인증 라우팅 추가:

```typescript
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

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
    if (state.status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [state.status]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  // 기존 폰트 로딩 등 코드는 그대로 유지
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
```

> **주의:** 기존 `_layout.tsx`의 폰트 로딩(`useFonts`), 테마 설정 등 코드는 `RootLayoutNav` 안에 그대로 유지한다. 파일을 읽고 기존 로직을 보존하면서 추가한다.

- [ ] **Step 3: 앱 실행으로 라우팅 확인**

```bash
npm run ios
```

Expected: 앱 시작 시 로그인 화면으로 이동

- [ ] **Step 4: 커밋**

```bash
git add src/app/_layout.tsx
git commit -m "feat: add auth routing to root layout"
```

---

### Task 13: Feed 탭 — API 연결

**Files:**
- Modify: `src/app/index.tsx`

- [ ] **Step 1: 현재 mock 데이터 의존성 확인**

현재 `src/app/index.tsx`는 `featuredPosts`, `nomadSnapshot`을 `@/data/mock`에서 가져온다.

- [ ] **Step 2: API 연결로 교체**

`src/app/index.tsx`의 전체 내용을 아래로 교체:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator, Pressable } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts, toggleLike } from '@/api/posts';
import type { Post } from '@/types/api';

export default function FeedScreen() {
  const theme = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLike = async (postId: number) => {
    const result = await toggleLike(postId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: result.liked, likes_count: p.likes_count + (result.liked ? 1 : -1) }
          : p,
      ),
    );
  };

  if (loading) {
    return (
      <ScreenShell eyebrow="NNAI Nomad" title="커뮤니티 피드" subtitle="">
        <ActivityIndicator />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="NNAI Nomad"
      title="A social layer for people who live and work in motion."
      subtitle="Trusted stays, city pulses, and move-week logistics."
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }>
      <ThemedText style={styles.sectionTitle}>Community feed</ThemedText>
      {posts.map((post) => (
        <View
          key={post.id}
          style={[styles.postCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={styles.author}>{post.author}</ThemedText>
          <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
          <ThemedText style={[styles.postBody, { color: theme.textSecondary }]}>{post.body}</ThemedText>
          <View style={styles.tagRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                <ThemedText style={styles.tagText}>#{tag}</ThemedText>
              </View>
            ))}
          </View>
          <Pressable onPress={() => handleLike(post.id)}>
            <ThemedText style={[styles.metrics, { color: post.liked ? theme.accent : theme.textSecondary }]}>
              {post.likes_count} likes · {post.city ?? ''}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: Spacing.one },
  postCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  author: { fontSize: 18, fontWeight: '700' },
  postTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700' },
  postBody: { fontSize: 15, lineHeight: 24, fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  tagText: { fontSize: 13, fontWeight: '700' },
  metrics: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
```

> **주의:** 기존 `ScreenShell`은 `refreshControl` prop을 받지 않을 수 있다. `src/components/screen-shell.tsx`를 열어 `ScrollView`에 `refreshControl` prop을 전달하는 코드를 추가한다.

- [ ] **Step 3: screen-shell.tsx에 refreshControl prop 추가**

`src/components/screen-shell.tsx`:
```typescript
// PropsWithChildren 타입에 refreshControl 추가
type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  refreshControl?: React.ReactElement;  // 추가
}>;

// ScrollView에 prop 전달
<ScrollView
  contentContainerStyle={styles.contentContainer}
  showsVerticalScrollIndicator={false}
  style={styles.scrollView}
  refreshControl={refreshControl}>  {/* 추가 */}
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/index.tsx src/components/screen-shell.tsx
git commit -m "feat: connect Feed tab to real API"
```

---

### Task 14: Discover 탭 — API 연결

**Files:**
- Modify: `src/app/discover.tsx`

- [ ] **Step 1: API 연결로 교체**

`src/app/discover.tsx`의 전체 내용을 아래로 교체:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator, Pressable } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCities } from '@/api/cities';
import { fetchCircles, toggleCircleMembership } from '@/api/circles';
import type { City, Circle } from '@/types/api';

export default function DiscoverScreen() {
  const theme = useTheme();
  const [cities, setCities] = useState<City[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cityData, circleData] = await Promise.all([fetchCities(), fetchCircles()]);
      setCities(cityData);
      setCircles(circleData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (circleId: number) => {
    const result = await toggleCircleMembership(circleId);
    setCircles((prev) =>
      prev.map((c) =>
        c.id === circleId
          ? { ...c, joined: result.joined, member_count: c.member_count + (result.joined ? 1 : -1) }
          : c,
      ),
    );
  };

  if (loading) return <ScreenShell eyebrow="City Radar" title="도시 탐색" subtitle=""><ActivityIndicator /></ScreenShell>;

  return (
    <ScreenShell
      eyebrow="City Radar"
      title="Discover where nomads are actually staying, working, and meeting."
      subtitle="Rank cities by network density, cost comfort, and practical quality-of-life signals."
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

      <ThemedText style={styles.sectionTitle}>Top cities</ThemedText>
      {cities.map((city) => (
        <View key={city.city_id} style={[styles.cityCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.cityRow}>
            <View style={styles.cityText}>
              <ThemedText style={styles.cityName}>{city.city_kr ?? city.city}</ThemedText>
              <ThemedText style={[styles.cityAngle, { color: theme.textSecondary }]}>{city.country}</ThemedText>
            </View>
            {city.nomad_score != null && (
              <View style={[styles.scoreBadge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={styles.scoreText}>{city.nomad_score.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.cityMeta, { color: theme.textSecondary }]}>
            {city.monthly_cost_usd != null ? `$${city.monthly_cost_usd}/mo` : ''}
            {city.internet_mbps != null ? `  ·  ${city.internet_mbps} Mbps` : ''}
          </ThemedText>
        </View>
      ))}

      <ThemedText style={styles.sectionTitle}>Circles</ThemedText>
      {circles.map((circle) => (
        <View key={circle.id} style={[styles.circleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={styles.circleName}>{circle.name}</ThemedText>
          <ThemedText style={[styles.circleMeta, { color: theme.accent }]}>{circle.member_count} members</ThemedText>
          {circle.description && (
            <ThemedText style={[styles.circleNote, { color: theme.textSecondary }]}>{circle.description}</ThemedText>
          )}
          <Pressable
            onPress={() => handleJoin(circle.id)}
            style={[styles.joinButton, { backgroundColor: circle.joined ? theme.backgroundSelected : theme.accent }]}>
            <ThemedText style={[styles.joinText, { color: circle.joined ? theme.text : '#fff' }]}>
              {circle.joined ? '참여 중' : '참여하기'}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  cityCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  cityText: { flex: 1, gap: Spacing.one },
  cityName: { fontSize: 20, fontWeight: '700' },
  cityAngle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  scoreBadge: { minWidth: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 18, paddingHorizontal: Spacing.two },
  scoreText: { fontSize: 22, fontWeight: '700' },
  cityMeta: { fontSize: 14, fontWeight: '500' },
  circleCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  circleName: { fontSize: 18, fontWeight: '700' },
  circleMeta: { fontSize: 14, fontWeight: '700' },
  circleNote: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  joinButton: { borderRadius: 999, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center', alignSelf: 'flex-start' },
  joinText: { fontSize: 14, fontWeight: '700' },
});
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/discover.tsx
git commit -m "feat: connect Discover tab to real API"
```

---

### Task 15: Plans 탭 — API 연결

**Files:**
- Modify: `src/app/plans.tsx`

- [ ] **Step 1: API 연결로 교체**

`src/app/plans.tsx`의 전체 내용을 아래로 교체:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, RefreshControl, ActivityIndicator, Pressable } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMoves, toggleChecklistItem, patchMoveStage } from '@/api/moves';
import type { MovePlan } from '@/types/api';

const STAGE_LABEL: Record<MovePlan['stage'], string> = {
  planning: 'Planning',
  booked: 'Flights blocked',
  completed: 'Completed',
};

export default function PlansScreen() {
  const theme = useTheme();
  const [moves, setMoves] = useState<MovePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMoves();
      setMoves(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleItem = async (moveId: number, itemId: number) => {
    const updated = await toggleChecklistItem(moveId, itemId);
    setMoves((prev) =>
      prev.map((m) =>
        m.id === moveId
          ? { ...m, checklist: m.checklist.map((i) => (i.id === itemId ? { ...i, is_done: updated.is_done } : i)) }
          : m,
      ),
    );
  };

  if (loading) return <ScreenShell eyebrow="Move Board" title="이동 계획" subtitle=""><ActivityIndicator /></ScreenShell>;

  return (
    <ScreenShell
      eyebrow="Move Board"
      title="Coordinate stays, visas, and focus windows without losing momentum."
      subtitle="A mobile-first control room for the operational side of digital nomad life."
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

      {moves.length === 0 && (
        <ThemedText style={[styles.empty, { color: theme.textSecondary }]}>
          아직 이동 계획이 없습니다.
        </ThemedText>
      )}

      {moves.map((move) => (
        <View key={move.id} style={[styles.planCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={styles.planTitle}>{move.title}</ThemedText>
          <ThemedText style={[styles.planStage, { color: theme.accent }]}>
            {STAGE_LABEL[move.stage]}
          </ThemedText>
          {move.checklist.map((item) => (
            <Pressable key={item.id} onPress={() => handleToggleItem(move.id, item.id)} style={styles.checkRow}>
              <View style={[styles.bullet, { backgroundColor: item.is_done ? theme.accent : theme.border }]} />
              <ThemedText style={[styles.checkText, { color: item.is_done ? theme.textSecondary : theme.text, textDecorationLine: item.is_done ? 'line-through' : 'none' }]}>
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: Spacing.four },
  planCard: { borderRadius: 24, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  planTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  planStage: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bullet: { width: 8, height: 8, borderRadius: 999 },
  checkText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '500' },
});
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/plans.tsx
git commit -m "feat: connect Plans tab to real API"
```

---

### Task 16: Profile 탭 + mock 데이터 정리

**Files:**
- Modify: `src/app/profile.tsx`
- Modify: `src/data/mock.ts` (삭제 또는 정리)

- [ ] **Step 1: Profile API 연결**

`src/app/profile.tsx`의 전체 내용을 아래로 교체:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchProfile } from '@/api/profile';
import { useAuth } from '@/store/auth-store';
import type { Profile } from '@/types/api';

export default function ProfileScreen() {
  const theme = useTheme();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchProfile();
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return <ScreenShell eyebrow="Identity" title="프로필" subtitle=""><ActivityIndicator /></ScreenShell>;
  }

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScreenShell
      eyebrow="Identity"
      title="Build a trusted nomad graph, not just another follower count."
      subtitle="Profiles focus on reliable reviews, hosted gatherings, and useful local knowledge.">

      <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <ThemedText style={styles.name}>{profile.name}</ThemedText>
        <ThemedText style={[styles.handle, { color: theme.accent }]}>{profile.email}</ThemedText>
        <View style={styles.badgeRow}>
          {profile.badges.map((badge) => (
            <View key={badge} style={[styles.badge, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'pins', value: profile.stats.pins },
          { label: 'posts', value: profile.stats.posts },
          { label: 'circles', value: profile.stats.circles },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</ThemedText>
          </View>
        ))}
      </View>

      <Pressable onPress={logout} style={[styles.logoutButton, { borderColor: theme.border }]}>
        <ThemedText style={[styles.logoutText, { color: theme.textSecondary }]}>로그아웃</ThemedText>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { borderRadius: 28, borderWidth: 1, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  avatar: { width: 84, height: 84, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '700' },
  handle: { fontSize: 14, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  badgeText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: { flex: 1, borderRadius: 22, borderWidth: 1, padding: Spacing.three, alignItems: 'center', gap: Spacing.one },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: '600' },
  logoutButton: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '600' },
});
```

- [ ] **Step 2: mock 데이터에서 앱 탭용 데이터 제거**

`src/data/mock.ts`에서 탭 화면이 직접 사용하던 데이터(`featuredPosts`, `nomadSnapshot`, `cityRadar`, `circles`, `moveBoard`, `stayPlaybook`, `profileSummary`)를 제거한다. 파일 전체가 비면 삭제한다.

- [ ] **Step 3: 전체 앱 실행 확인**

```bash
npm run ios
```

Expected:
1. 앱 시작 → 로그인 화면
2. Google 로그인 성공 → 탭 화면으로 이동
3. Feed: 실제 포스트 목록 (또는 빈 상태)
4. Discover: 실제 도시 목록 (verified_cities 데이터)
5. Plans: 실제 이동 계획 목록 (또는 빈 상태)
6. Profile: 실제 유저 정보

- [ ] **Step 4: 최종 커밋**

```bash
git add src/app/profile.tsx src/data/mock.ts
git commit -m "feat: connect Profile tab to real API, remove mock data"
```

---

## 완료 기준

- [ ] 백엔드: 8개 신규 테이블 생성 완료
- [ ] 백엔드: `/auth/mobile/*`, `/api/mobile/*` 엔드포인트 전부 배포
- [ ] 백엔드: 모든 pytest 통과
- [ ] 앱: Google 로그인 후 JWT 저장 → 탭 화면 진입
- [ ] 앱: 4개 탭 모두 실제 API 데이터 표시
- [ ] 앱: mock 데이터 import 없음
- [ ] 앱: 로그아웃 → 로그인 화면으로 복귀
