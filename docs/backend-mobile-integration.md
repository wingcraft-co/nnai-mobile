# 백엔드 모바일 연동 가이드

> **대상 레포:** `nnai` (Python / FastAPI, Railway 배포)
> **목적:** 모바일 앱 전용 JWT 인증 + API 엔드포인트 추가
> **원칙:** 기존 웹 코드는 일체 수정하지 않는다

---

## 체크리스트

- [ ] Step 1: 패키지 추가
- [ ] Step 2: 환경변수 설정
- [ ] Step 3: DB 마이그레이션
- [ ] Step 4: JWT 유틸리티 + 미들웨어
- [ ] Step 5: 인증 라우터
- [ ] Step 6: Feed 라우터
- [ ] Step 7: Discover 라우터
- [ ] Step 8: Plans 라우터
- [ ] Step 9: Profile 라우터
- [ ] Step 10: Recommend 라우터
- [ ] Step 11: Nomad Type Actions 마이그레이션
- [ ] Step 12: Nomad Type Actions 라우터
- [ ] Step 13: main.py 라우터 등록
- [ ] Step 14: 배포 확인

---

## Step 1: 패키지 추가

`requirements.txt`에 추가:

```
PyJWT>=2.8.0
httpx>=0.27.0
```

```bash
pip install PyJWT>=2.8.0 httpx>=0.27.0
```

---

## Step 2: 환경변수 설정

Railway 대시보드 → nnai 서비스 → Variables에 추가:

```
JWT_SECRET=<32자 이상의 랜덤 문자열>
```

로컬 `.env` 파일에도 추가:

```
JWT_SECRET=local_dev_secret_change_in_prod
```

> `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`은 이미 설정되어 있다고 가정합니다.
> 없다면 Google Cloud Console → OAuth 2.0 클라이언트 ID에서 발급 후 추가하세요.

---

## Step 3: DB 마이그레이션

파일 생성: `migrations/001_mobile_tables.sql`

```sql
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

실행:

```bash
psql $DATABASE_URL -f migrations/001_mobile_tables.sql
```

확인:

```bash
psql $DATABASE_URL -c "\dt" | grep -E "posts|circles|move_plans|user_badges"
```

---

## Step 4: JWT 유틸리티 + 미들웨어

파일 생성: `utils/mobile_auth.py`

```python
import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException

JWT_SECRET = os.environ["JWT_SECRET"]
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
    """FastAPI dependency — Bearer JWT에서 user_id를 반환한다."""
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

---

## Step 5: 인증 라우터

파일 생성: `routers/mobile_auth.py`

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


def _get_user(user_id: str) -> dict | None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name, picture FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    return {"id": row[0], "name": row[1], "picture": row[2]} if row else None


@router.post("/token")
async def mobile_token(body: TokenRequest):
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

    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    info = userinfo_res.json()
    user_id = info["sub"]

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (id, email, name, picture, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email,
                name  = EXCLUDED.name,
                picture = EXCLUDED.picture
    """, (user_id, info.get("email"), info.get("name"), info.get("picture")))
    conn.commit()

    return {
        "token": create_jwt(user_id),
        "user": {
            "uid": user_id,
            "name": info.get("name"),
            "picture": info.get("picture"),
        },
    }


@router.get("/me")
def mobile_me(user_id: str = Depends(require_mobile_auth)):
    user = _get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"uid": user["id"], "name": user["name"], "picture": user["picture"]}
```

---

## Step 6: Feed 라우터

파일 생성: `routers/mobile_feed.py`

```python
import json
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
               EXISTS(
                   SELECT 1 FROM post_likes
                   WHERE post_id = p.id AND user_id = %s
               ) AS liked
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
        cur.execute("DELETE FROM post_likes WHERE post_id = %s AND user_id = %s", (post_id, user_id))
        cur.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id = %s", (post_id,))
    else:
        cur.execute("INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)", (post_id, user_id))
        cur.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = %s", (post_id,))
    conn.commit()
    return {"liked": not already_liked}


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

---

## Step 7: Discover 라우터

파일 생성: `routers/mobile_discover.py`

```python
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
               monthly_cost_usd, internet_mbps, safety_score, english_score, nomad_score
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
        FROM verified_cities WHERE city_id = %s
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
               EXISTS(
                   SELECT 1 FROM circle_members
                   WHERE circle_id = c.id AND user_id = %s
               ) AS joined
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
def toggle_circle(circle_id: int, user_id: str = Depends(require_mobile_auth)):
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
    else:
        cur.execute(
            "INSERT INTO circle_members (circle_id, user_id) VALUES (%s, %s)",
            (circle_id, user_id),
        )
        cur.execute("UPDATE circles SET member_count = member_count + 1 WHERE id = %s", (circle_id,))
    conn.commit()
    return {"joined": not is_member}


@router.get("/pins")
def get_pins(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, city, display, note, lat, lng, created_at
        FROM pins WHERE user_id = %s
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

---

## Step 8: Plans 라우터

파일 생성: `routers/mobile_plans.py`

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
        WHERE plan_id = %s ORDER BY sort_order ASC
    """, (plan_id,))
    return [{"id": r[0], "text": r[1], "is_done": r[2], "sort_order": r[3]}
            for r in cur.fetchall()]


@router.get("/moves")
def get_moves(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, from_city, to_city, stage, created_at
        FROM move_plans WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    return [
        {
            "id": r[0], "title": r[1], "from_city": r[2],
            "to_city": r[3], "stage": r[4], "created_at": str(r[5]),
            "checklist": _get_checklist(cur, r[0]),
        }
        for r in cur.fetchall()
    ]


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
        cur.execute(
            "INSERT INTO move_checklist_items (plan_id, text, sort_order) VALUES (%s, %s, %s)",
            (plan_id, text, i),
        )
    conn.commit()
    return {
        "id": r[0], "title": r[1], "from_city": r[2], "to_city": r[3],
        "stage": r[4], "created_at": str(r[5]),
        "checklist": _get_checklist(cur, plan_id),
    }


@router.patch("/moves/{move_id}")
def patch_move(move_id: int, body: MovePatch, user_id: str = Depends(require_mobile_auth)):
    valid = ("planning", "booked", "completed")
    if body.stage not in valid:
        raise HTTPException(status_code=422, detail=f"stage must be one of {valid}")
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
def toggle_item(move_id: int, item_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
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

---

## Step 9: Profile 라우터

파일 생성: `routers/mobile_profile.py`

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

---

## Step 10: Recommend 라우터

파일 생성: `routers/mobile_recommend.py`

> **주의:** `handle_recommend`, `handle_detail` 함수는 기존 recommend 로직이 있는 파일에서 가져와야 합니다.
> 기존 코드에서 `/api/recommend`, `/api/detail` 핸들러 내부의 비즈니스 로직 함수를 찾아 이름을 확인하고 import 경로를 맞춰주세요.

```python
from fastapi import APIRouter, Depends, Request
from utils.mobile_auth import require_mobile_auth

router = APIRouter(prefix="/api/mobile", tags=["mobile-recommend"])

# 아래 import 경로는 기존 코드 구조에 맞게 수정하세요
# 예: from routers.recommend import handle_recommend, handle_detail
# 또는: from services.recommend import run_recommend, run_detail
from routers.recommend import handle_recommend, handle_detail  # ← 경로 확인 필요


@router.post("/recommend")
async def mobile_recommend(request: Request, user_id: str = Depends(require_mobile_auth)):
    body = await request.json()
    return await handle_recommend(body)


@router.post("/detail")
async def mobile_detail(request: Request, user_id: str = Depends(require_mobile_auth)):
    body = await request.json()
    return await handle_detail(body, user_id)
```

---

## Step 11: Nomad Type Actions 마이그레이션

파일 생성: `migrations/002_nomad_type_actions.sql`

```sql
CREATE TABLE IF NOT EXISTS planner_boards (
    id           BIGSERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country      TEXT NOT NULL,
    city         TEXT,
    title        TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planner_tasks (
    id           BIGSERIAL PRIMARY KEY,
    board_id     BIGINT NOT NULL REFERENCES planner_boards(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    is_done      BOOLEAN NOT NULL DEFAULT FALSE,
    due_date     DATE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS free_spirit_spins (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country              TEXT,
    city                 TEXT,
    lat                  DOUBLE PRECISION NOT NULL,
    lng                  DOUBLE PRECISION NOT NULL,
    radius_m             INTEGER NOT NULL DEFAULT 1500,
    keyword              TEXT NOT NULL DEFAULT 'cafe',
    selected_place_id    TEXT,
    selected_name        TEXT,
    selected_address     TEXT,
    selected_rating      DOUBLE PRECISION,
    selected_lat         DOUBLE PRECISION,
    selected_lng         DOUBLE PRECISION,
    candidates           JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wanderer_hops (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_country       TEXT,
    to_country         TEXT NOT NULL,
    to_city            TEXT,
    note               TEXT,
    target_month       TEXT,
    status             TEXT NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned', 'booked', 'visited', 'dropped')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_event_recs (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source             TEXT NOT NULL
                       CHECK (source IN ('google_places', 'eventbrite', 'ticketmaster')),
    source_event_id    TEXT NOT NULL,
    title              TEXT NOT NULL,
    venue_name         TEXT,
    address            TEXT,
    country            TEXT,
    city               TEXT,
    starts_at          TIMESTAMPTZ,
    ends_at            TIMESTAMPTZ,
    lat                DOUBLE PRECISION,
    lng                DOUBLE PRECISION,
    radius_m           INTEGER NOT NULL DEFAULT 5000,
    status             TEXT NOT NULL DEFAULT 'saved'
                       CHECK (status IN ('recommended', 'saved', 'attended', 'hidden')),
    metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, source, source_event_id)
);

CREATE TABLE IF NOT EXISTS pioneer_milestones (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country            TEXT NOT NULL,
    city               TEXT,
    category           TEXT NOT NULL
                       CHECK (category IN ('visa', 'housing', 'tax', 'work', 'language', 'etc')),
    title              TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'todo'
                       CHECK (status IN ('todo', 'doing', 'done', 'blocked')),
    target_date        DATE,
    note               TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planner_boards_user_updated
ON planner_boards (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_board_sort
ON planner_tasks (board_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_free_spirit_spins_user_created
ON free_spirit_spins (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wanderer_hops_user_status
ON wanderer_hops (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_local_event_recs_user_status
ON local_event_recs (user_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_pioneer_milestones_user_status
ON pioneer_milestones (user_id, status, updated_at DESC);
```

실행:

```bash
psql $DATABASE_URL -f migrations/002_nomad_type_actions.sql
```

---

## Step 12: Nomad Type Actions 라우터

파일 생성: `routers/mobile_type_actions.py`

필수 엔드포인트:

- Planner
  - `GET/POST /api/mobile/type-actions/planner/boards`
  - `POST /api/mobile/type-actions/planner/boards/{board_id}/tasks`
  - `PATCH/DELETE /api/mobile/type-actions/planner/tasks/{task_id}`
- Free Spirit
  - `POST /api/mobile/type-actions/free-spirit/spins`
  - `GET /api/mobile/type-actions/free-spirit/spins`
- Wanderer
  - `GET/POST/PATCH/DELETE /api/mobile/type-actions/wanderer/hops`
- Local
  - `GET /api/mobile/type-actions/local/events/recommendations`
  - `GET /api/mobile/type-actions/local/events/saved`
  - `POST /api/mobile/type-actions/local/events/save`
  - `PATCH /api/mobile/type-actions/local/events/{event_id}`
- Pioneer
  - `GET/POST/PATCH/DELETE /api/mobile/type-actions/pioneer/milestones`

필수 환경변수:

```env
GOOGLE_PLACES_API_KEY=<google places api key>
EVENTBRITE_API_TOKEN=<eventbrite token>
TICKETMASTER_API_KEY=<ticketmaster key>
```

구현 규칙:
- 모든 UPDATE/DELETE 쿼리에는 `AND user_id = %s`를 포함해 소유권 검증
- Google Places 응답은 모바일 UI에 필요한 필드만 추출하여 `free_spirit_spins.candidates`에 저장
- 스핀 결과는 후보 중 서버에서 무작위 1개를 선택해 `selected_*` 컬럼에 저장
- Local 이벤트 추천은 `Google Places`를 먼저 조회하고, 결과가 부족하면 `Eventbrite/Ticketmaster`를 fallback으로 조회
- Local 이벤트 추천 기본 반경은 `5000m`, 푸시 없이 인앱 조회 전용으로 제공

스켈레톤 코드:

```python
# routers/mobile_type_actions.py
import json
import os
import random
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from utils.db import get_conn
from utils.mobile_auth import require_mobile_auth

router = APIRouter(prefix="/api/mobile/type-actions", tags=["mobile-type-actions"])

GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")
EVENTBRITE_API_TOKEN = os.environ.get("EVENTBRITE_API_TOKEN")
TICKETMASTER_API_KEY = os.environ.get("TICKETMASTER_API_KEY")


# ---------- Planner ----------
class PlannerBoardCreate(BaseModel):
    country: str
    city: Optional[str] = None
    title: str


class PlannerTaskCreate(BaseModel):
    text: str
    due_date: Optional[str] = None
    sort_order: int = 0


class PlannerTaskPatch(BaseModel):
    is_done: Optional[bool] = None
    text: Optional[str] = None
    due_date: Optional[str] = None


@router.get("/planner/boards")
def get_planner_boards(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, country, city, title, created_at, updated_at
        FROM planner_boards
        WHERE user_id = %s
        ORDER BY updated_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "country": r[1],
            "city": r[2],
            "title": r[3],
            "created_at": str(r[4]),
            "updated_at": str(r[5]),
        }
        for r in rows
    ]


@router.post("/planner/boards", status_code=201)
def create_planner_board(body: PlannerBoardCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO planner_boards (user_id, country, city, title)
        VALUES (%s, %s, %s, %s)
        RETURNING id, country, city, title, created_at, updated_at
        """,
        (user_id, body.country, body.city, body.title),
    )
    conn.commit()
    r = cur.fetchone()
    return {
        "id": r[0],
        "country": r[1],
        "city": r[2],
        "title": r[3],
        "created_at": str(r[4]),
        "updated_at": str(r[5]),
    }


@router.patch("/planner/boards/{board_id}")
def patch_planner_board(
    board_id: int,
    body: PlannerBoardCreate,
    user_id: str = Depends(require_mobile_auth),
):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE planner_boards
        SET country = %s, city = %s, title = %s, updated_at = NOW()
        WHERE id = %s AND user_id = %s
        RETURNING id, country, city, title, created_at, updated_at
        """,
        (body.country, body.city, body.title, board_id, user_id),
    )
    conn.commit()
    r = cur.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Board not found")
    return {
        "id": r[0],
        "country": r[1],
        "city": r[2],
        "title": r[3],
        "created_at": str(r[4]),
        "updated_at": str(r[5]),
    }


@router.delete("/planner/boards/{board_id}", status_code=204)
def delete_planner_board(board_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM planner_boards WHERE id = %s AND user_id = %s RETURNING id", (board_id, user_id))
    conn.commit()
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Board not found")


@router.post("/planner/boards/{board_id}/tasks", status_code=201)
def create_planner_task(board_id: int, body: PlannerTaskCreate, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM planner_boards WHERE id = %s AND user_id = %s", (board_id, user_id))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Board not found")
    cur.execute(
        """
        INSERT INTO planner_tasks (board_id, text, due_date, sort_order)
        VALUES (%s, %s, %s, %s)
        RETURNING id, board_id, text, is_done, due_date, sort_order
        """,
        (board_id, body.text, body.due_date, body.sort_order),
    )
    conn.commit()
    r = cur.fetchone()
    return {
        "id": r[0],
        "board_id": r[1],
        "text": r[2],
        "is_done": r[3],
        "due_date": str(r[4]) if r[4] else None,
        "sort_order": r[5],
    }


@router.patch("/planner/tasks/{task_id}")
def patch_planner_task(task_id: int, body: PlannerTaskPatch, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT t.id
        FROM planner_tasks t
        JOIN planner_boards b ON b.id = t.board_id
        WHERE t.id = %s AND b.user_id = %s
        """,
        (task_id, user_id),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Task not found")

    cur.execute(
        """
        UPDATE planner_tasks
        SET is_done = COALESCE(%s, is_done),
            text = COALESCE(%s, text),
            due_date = COALESCE(%s, due_date),
            updated_at = NOW()
        WHERE id = %s
        RETURNING id, board_id, text, is_done, due_date, sort_order
        """,
        (body.is_done, body.text, body.due_date, task_id),
    )
    conn.commit()
    r = cur.fetchone()
    return {
        "id": r[0],
        "board_id": r[1],
        "text": r[2],
        "is_done": r[3],
        "due_date": str(r[4]) if r[4] else None,
        "sort_order": r[5],
    }


@router.delete("/planner/tasks/{task_id}", status_code=204)
def delete_planner_task(task_id: int, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        DELETE FROM planner_tasks t
        USING planner_boards b
        WHERE t.id = %s
          AND t.board_id = b.id
          AND b.user_id = %s
        RETURNING t.id
        """,
        (task_id, user_id),
    )
    conn.commit()
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Task not found")


# ---------- Free Spirit ----------
class SpinCreate(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    lat: float
    lng: float
    radius_m: int = 1500
    keyword: str = "cafe"


async def _fetch_google_places(lat: float, lng: float, radius_m: int, keyword: str) -> list[dict]:
    if not GOOGLE_PLACES_API_KEY:
        return []
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "keyword": keyword,
        "key": GOOGLE_PLACES_API_KEY,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(url, params=params)
    if res.status_code != 200:
        return []
    data = res.json().get("results", [])
    return [
        {
            "place_id": item.get("place_id"),
            "name": item.get("name"),
            "address": item.get("vicinity"),
            "rating": item.get("rating"),
            "lat": item.get("geometry", {}).get("location", {}).get("lat"),
            "lng": item.get("geometry", {}).get("location", {}).get("lng"),
        }
        for item in data[:20]
        if item.get("place_id") and item.get("name")
    ]


@router.post("/free-spirit/spins")
async def create_free_spirit_spin(body: SpinCreate, user_id: str = Depends(require_mobile_auth)):
    candidates = await _fetch_google_places(body.lat, body.lng, body.radius_m, body.keyword)
    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates found")
    selected = random.choice(candidates)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO free_spirit_spins (
            user_id, country, city, lat, lng, radius_m, keyword,
            selected_place_id, selected_name, selected_address, selected_rating, selected_lat, selected_lng,
            candidates
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        RETURNING id
        """,
        (
            user_id,
            body.country,
            body.city,
            body.lat,
            body.lng,
            body.radius_m,
            body.keyword,
            selected["place_id"],
            selected["name"],
            selected.get("address"),
            selected.get("rating"),
            selected.get("lat"),
            selected.get("lng"),
            json.dumps(candidates),
        ),
    )
    conn.commit()
    spin_id = cur.fetchone()[0]
    return {"spin_id": spin_id, "selected": selected, "candidates_count": len(candidates)}


# ---------- Local Events ----------
class LocalEventSave(BaseModel):
    source: str = Field(pattern="^(google_places|eventbrite|ticketmaster)$")
    source_event_id: str
    title: str
    venue_name: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_m: int = 5000


class LocalEventPatch(BaseModel):
    status: str = Field(pattern="^(recommended|saved|attended|hidden)$")


@router.get("/local/events/recommendations")
async def get_local_event_recommendations(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_m: int = Query(5000, ge=500, le=20000),
):
    # 1) Google Places 우선 조회
    places = await _fetch_google_places(lat, lng, radius_m, "festival OR event")
    if len(places) >= 6:
        return {"source_priority": ["google_places"], "items": places}

    # 2) 부족하면 Eventbrite/Ticketmaster fallback (스켈레톤)
    fallback_items: list[dict] = []
    if EVENTBRITE_API_TOKEN:
        fallback_items.append({"source": "eventbrite", "title": "Sample Eventbrite Event"})
    if TICKETMASTER_API_KEY:
        fallback_items.append({"source": "ticketmaster", "title": "Sample Ticketmaster Event"})
    return {"source_priority": ["google_places", "eventbrite", "ticketmaster"], "items": places + fallback_items}


@router.get("/local/events/saved")
def get_saved_local_events(user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, source, source_event_id, title, venue_name, address, country, city,
               starts_at, ends_at, lat, lng, radius_m, status, created_at, updated_at
        FROM local_event_recs
        WHERE user_id = %s
        ORDER BY updated_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    return [
        {
            "id": r[0],
            "source": r[1],
            "source_event_id": r[2],
            "title": r[3],
            "venue_name": r[4],
            "address": r[5],
            "country": r[6],
            "city": r[7],
            "starts_at": str(r[8]) if r[8] else None,
            "ends_at": str(r[9]) if r[9] else None,
            "lat": r[10],
            "lng": r[11],
            "radius_m": r[12],
            "status": r[13],
            "created_at": str(r[14]),
            "updated_at": str(r[15]),
        }
        for r in rows
    ]


@router.post("/local/events/save", status_code=201)
def save_local_event(body: LocalEventSave, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO local_event_recs (
            user_id, source, source_event_id, title, venue_name, address,
            country, city, starts_at, ends_at, lat, lng, radius_m, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'saved')
        ON CONFLICT (user_id, source, source_event_id)
        DO UPDATE SET updated_at = NOW(), status = 'saved'
        RETURNING id
        """,
        (
            user_id,
            body.source,
            body.source_event_id,
            body.title,
            body.venue_name,
            body.address,
            body.country,
            body.city,
            body.starts_at,
            body.ends_at,
            body.lat,
            body.lng,
            body.radius_m,
        ),
    )
    conn.commit()
    return {"id": cur.fetchone()[0], "status": "saved"}


@router.patch("/local/events/{event_id}")
def patch_local_event(event_id: int, body: LocalEventPatch, user_id: str = Depends(require_mobile_auth)):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE local_event_recs
        SET status = %s, updated_at = NOW()
        WHERE id = %s AND user_id = %s
        RETURNING id, status
        """,
        (body.status, event_id, user_id),
    )
    conn.commit()
    r = cur.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"id": r[0], "status": r[1]}


# ---------- Wanderer / Local / Pioneer ----------
# 나머지 CRUD도 동일 패턴으로 구현:
# - INSERT 시 user_id 포함
# - UPDATE/DELETE 시 id + user_id 소유권 검증
# - 목록은 updated_at DESC 정렬
```

---

## Step 13: main.py에 라우터 등록

기존 `main.py`의 라우터 등록 부분에 아래 코드를 **추가**합니다 (기존 코드 수정 없이):

```python
# 모바일 전용 라우터 (기존 웹 라우터와 완전히 독립)
from routers.mobile_auth import router as mobile_auth_router
from routers.mobile_feed import router as mobile_feed_router
from routers.mobile_discover import router as mobile_discover_router
from routers.mobile_plans import router as mobile_plans_router
from routers.mobile_profile import router as mobile_profile_router
from routers.mobile_recommend import router as mobile_recommend_router
from routers.mobile_type_actions import router as mobile_type_actions_router

app.include_router(mobile_auth_router)
app.include_router(mobile_feed_router)
app.include_router(mobile_discover_router)
app.include_router(mobile_plans_router)
app.include_router(mobile_profile_router)
app.include_router(mobile_recommend_router)
app.include_router(mobile_type_actions_router)
```

---

## Step 14: 배포 확인

Railway에 push 후:

```bash
# 1. 미인증 접근 → 401 확인
curl https://api.nnai.app/auth/mobile/me
# Expected: {"detail":"Bearer token required"}

# 2. 도시 목록 → 401 확인
curl https://api.nnai.app/api/mobile/cities
# Expected: {"detail":"Bearer token required"}

# 3. 포스트 목록 → 401 확인
curl https://api.nnai.app/api/mobile/posts
# Expected: {"detail":"Bearer token required"}
```

모든 엔드포인트가 401을 반환하면 정상입니다. JWT 발급은 모바일 앱에서 Google OAuth 후 자동으로 이루어집니다.

---

## 추가된 파일 목록

```
migrations/
  001_mobile_tables.sql
  002_nomad_type_actions.sql

utils/
  mobile_auth.py          ← 신규

routers/
  mobile_auth.py          ← 신규
  mobile_feed.py          ← 신규
  mobile_discover.py      ← 신규
  mobile_plans.py         ← 신규
  mobile_profile.py       ← 신규
  mobile_recommend.py     ← 신규 (recommend import 경로 확인 필요)
  mobile_type_actions.py  ← 신규

main.py                   ← 8줄 추가 (기존 코드 수정 없음)
```

**기존 파일 수정 없음** — 웹 서비스에 영향 없습니다.
