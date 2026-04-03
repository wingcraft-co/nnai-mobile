import type { ChecklistItem, Circle, City, MovePlan, Post, Profile, User } from '@/types/api';
import { getAppLanguage } from '@/i18n';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const isKorean = getAppLanguage() === 'ko';
const tx = (ko: string, en: string) => (isKorean ? ko : en);

let posts: Post[] = [
  {
    id: 1,
    user_id: 'dev',
    author: tx('개발 사용자', 'Dev User'),
    picture: '',
    title: tx('이번 주 리스본 코워킹 스팟', 'Lisbon coworking spots this week'),
    body: tx(
      '오전에는 바이샤에서 집중하고 오후에는 카이스 두 소드레 근처에서 콜을 했는데 좋았습니다.',
      'Morning focus at Baixa, afternoon calls near Cais do Sodre worked great.',
    ),
    tags: ['lisbon', 'coworking'],
    city: 'Lisbon',
    likes_count: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    liked: false,
  },
  {
    id: 2,
    user_id: 'nomad_02',
    author: 'Mina Park',
    picture: '',
    title: tx('치앙마이 비자 런 체크리스트', 'Chiang Mai visa run checklist'),
    body: tx(
      '국가별 규정에 맞춰 서류를 묶고 공항 이동 동선을 단순화했습니다.',
      'I grouped docs by country rules, made airport transfer super simple.',
    ),
    tags: ['chiangmai', 'visa'],
    city: 'Chiang Mai',
    likes_count: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    liked: true,
  },
  {
    id: 3,
    user_id: 'nomad_03',
    author: tx('수연 김', 'Suyeon Kim'),
    picture: 'https://picsum.photos/seed/nnai-user-3/200/200',
    title: tx('발리 우붓 집중 스프린트 후기', 'Ubud deep-work sprint recap'),
    body: tx('3일간 오전 집중, 오후 네트워킹으로 리듬이 딱 맞았습니다.', 'Three days of morning focus and afternoon networking worked perfectly.'),
    tags: ['bali', 'deepwork'],
    city: 'Ubud',
    likes_count: 22,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    liked: false,
  },
  {
    id: 4,
    user_id: 'nomad_04',
    author: tx('Alex Chen', 'Alex Chen'),
    picture: 'https://picsum.photos/seed/nnai-user-4/200/200',
    title: tx('포르투 야간 치안 체감 공유', 'Porto night safety notes'),
    body: tx('강변 쪽은 늦은 시간에도 비교적 안전했지만 외곽은 택시 추천.', 'Riverfront felt safe late night, but I recommend a taxi for outer areas.'),
    tags: ['porto', 'safety'],
    city: 'Porto',
    likes_count: 9,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    liked: false,
  },
  {
    id: 5,
    user_id: 'nomad_05',
    author: tx('윤하 정', 'Yoonha Jung'),
    picture: 'https://picsum.photos/seed/nnai-user-5/200/200',
    title: tx('타이베이 생활비 업데이트', 'Taipei monthly cost update'),
    body: tx('숙소비가 올랐지만 식비/교통이 안정적이라 총합은 유지됩니다.', 'Accommodation rose, but food/transport remained stable so totals stayed reasonable.'),
    tags: ['taipei', 'budget'],
    city: 'Taipei',
    likes_count: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    liked: true,
  },
  {
    id: 6,
    user_id: 'nomad_06',
    author: tx('Jin Lee', 'Jin Lee'),
    picture: 'https://picsum.photos/seed/nnai-user-6/200/200',
    title: tx('도쿄 장기체류 숙소 찾는 법', 'How I found long-stay housing in Tokyo'),
    body: tx('지역별 체크리스트를 먼저 만들고 계약 조건을 표준화해 비교했습니다.', 'I standardized contract terms and compared neighborhoods with a checklist.'),
    tags: ['tokyo', 'housing'],
    city: 'Tokyo',
    likes_count: 17,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    liked: false,
  },
  {
    id: 7,
    user_id: 'nomad_07',
    author: tx('민재 박', 'Minjae Park'),
    picture: 'https://picsum.photos/seed/nnai-user-7/200/200',
    title: tx('리스본-포르투 이동 루틴', 'Lisbon-to-Porto move routine'),
    body: tx('짐은 최소화하고 현지 커뮤니티에 먼저 메시지 보내는 게 효과적이었습니다.', 'Traveling light and messaging local communities in advance worked best.'),
    tags: ['portugal', 'move'],
    city: 'Lisbon',
    likes_count: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
    liked: false,
  },
  {
    id: 8,
    user_id: 'nomad_08',
    author: tx('Emma Cho', 'Emma Cho'),
    picture: 'https://picsum.photos/seed/nnai-user-8/200/200',
    title: tx('치앙마이 코워킹 비교', 'Chiang Mai coworking comparison'),
    body: tx('좌석 간격, 미팅룸, 소음 기준으로 4곳 비교표를 만들었습니다.', 'I compared four spaces by desk spacing, meeting rooms, and noise level.'),
    tags: ['chiangmai', 'coworking'],
    city: 'Chiang Mai',
    likes_count: 11,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    liked: true,
  },
  {
    id: 9,
    user_id: 'nomad_09',
    author: tx('태훈 최', 'Taehun Choi'),
    picture: 'https://picsum.photos/seed/nnai-user-9/200/200',
    title: tx('디지털 노마드 세금 정리 팁', 'Digital nomad tax prep tips'),
    body: tx('국가별 체류일 계산표를 먼저 만든 뒤 증빙자료를 월별로 분류했습니다.', 'I built a stay-day matrix first, then organized tax records by month.'),
    tags: ['tax', 'planning'],
    city: 'Seoul',
    likes_count: 19,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    liked: false,
  },
  {
    id: 10,
    user_id: 'nomad_10',
    author: tx('Noah Kim', 'Noah Kim'),
    picture: 'https://picsum.photos/seed/nnai-user-10/200/200',
    title: tx('부다페스트 카페 워크스팟', 'Budapest cafe work spots'),
    body: tx('콘센트/와이파이/소음 기준으로 장시간 작업 가능한 카페를 정리했습니다.', 'I listed cafés suitable for long sessions by outlets, wifi, and ambient noise.'),
    tags: ['budapest', 'cafes'],
    city: 'Budapest',
    likes_count: 8,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    liked: false,
  },
];

const cities: City[] = [
  {
    city_id: 'lisbon',
    city: 'Lisbon',
    city_kr: '리스본',
    country: 'Portugal',
    country_id: 'PT',
    monthly_cost_usd: 2200,
    internet_mbps: 180,
    safety_score: 8.2,
    english_score: 8.7,
    nomad_score: 8.9,
  },
  {
    city_id: 'chiang-mai',
    city: 'Chiang Mai',
    city_kr: '치앙마이',
    country: 'Thailand',
    country_id: 'TH',
    monthly_cost_usd: 1300,
    internet_mbps: 140,
    safety_score: 8.6,
    english_score: 7.1,
    nomad_score: 8.8,
  },
];

let circles: Circle[] = [
  {
    id: 1,
    name: tx('리모트 빌더스', 'Remote Builders'),
    description: tx('프로덕트 중심 메이커 그룹', 'Product-focused makers'),
    member_count: 128,
    joined: true,
  },
  {
    id: 2,
    name: tx('비자 오퍼레이션', 'Visa Ops'),
    description: tx('법률/서류 준비 지원', 'Legal + paperwork support'),
    member_count: 73,
    joined: false,
  },
  {
    id: 3,
    name: tx('포커스 세션', 'Focus Sessions'),
    description: tx('공동 집중 타이머 + 회고', 'Group focus timers and retrospectives'),
    member_count: 54,
    joined: false,
  },
  {
    id: 4,
    name: tx('로컬 정착', 'Local Landing'),
    description: tx('도시별 입주/교통/병원 정보 공유', 'City-specific housing, transit, and clinic notes'),
    member_count: 89,
    joined: true,
  },
];

let moves: MovePlan[] = [
  {
    id: 1,
    title: tx('서울 -> 리스본', 'Seoul -> Lisbon'),
    from_city: 'Seoul',
    to_city: 'Lisbon',
    stage: 'planning',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    checklist: [
      { id: 1, text: '은행 잔고 증빙 준비', is_done: true, sort_order: 1 },
      { id: 2, text: '항공권 가격 알림 설정', is_done: false, sort_order: 2 },
      { id: 3, text: '장기 숙소 후보 5곳 정리', is_done: false, sort_order: 3 },
    ],
  },
  {
    id: 2,
    title: tx('치앙마이 -> 타이베이', 'Chiang Mai -> Taipei'),
    from_city: 'Chiang Mai',
    to_city: 'Taipei',
    stage: 'booked',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    checklist: [
      { id: 11, text: tx('숙소 계약서 사본 보관', 'Save a copy of the housing contract'), is_done: true, sort_order: 1 },
      { id: 12, text: tx('공항 픽업 예약', 'Book airport pickup'), is_done: true, sort_order: 2 },
      { id: 13, text: tx('현지 eSIM 준비', 'Prepare local eSIM'), is_done: false, sort_order: 3 },
    ],
  },
  {
    id: 3,
    title: tx('리스본 -> 포르투', 'Lisbon -> Porto'),
    from_city: 'Lisbon',
    to_city: 'Porto',
    stage: 'completed',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    checklist: [
      { id: 21, text: tx('기차표 예매', 'Book train ticket'), is_done: true, sort_order: 1 },
      { id: 22, text: tx('짐 배송 예약', 'Schedule luggage shipping'), is_done: true, sort_order: 2 },
      { id: 23, text: tx('코워킹 데이패스 결제', 'Pay for coworking day pass'), is_done: true, sort_order: 3 },
    ],
  },
];

const profile: Profile = {
  uid: 'dev',
  name: tx('개발 사용자', 'Dev User'),
  picture: '',
  email: 'dev@nnai.app',
  badges: [tx('얼리 노마드', 'Early Nomad'), tx('서클 호스트', 'Circle Host')],
  stats: {
    pins: 14,
    posts: 42,
    circles: 4,
  },
};

const devUser: User = {
  uid: 'dev',
  name: tx('개발 사용자', 'Dev User'),
  picture: '',
  email: 'dev@nnai.app',
};

function normalizeMethod(method?: string): HttpMethod {
  return (method?.toUpperCase() as HttpMethod) || 'GET';
}

export async function devMockApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = normalizeMethod(options.method);
  const url = new URL(path, 'https://mock.local');
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/auth/mobile/me') {
    return devUser as T;
  }

  if (method === 'GET' && pathname === '/api/mobile/posts') {
    return posts as T;
  }

  if (method === 'POST' && pathname === '/api/mobile/posts') {
    const body = (options.body as string | undefined) ?? '{}';
    const parsed = JSON.parse(body) as {
      title?: string;
      body?: string;
      tags?: string[];
      city?: string | null;
      picture?: string;
    };

    const nextId = posts.length > 0 ? Math.max(...posts.map((item) => item.id)) + 1 : 1;
    const created: Post = {
      id: nextId,
      user_id: devUser.uid,
      author: devUser.name,
      picture: parsed.picture?.trim() || '',
      title: parsed.title?.trim() || tx('새 포스트', 'New post'),
      body: parsed.body?.trim() || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      city: parsed.city ?? null,
      likes_count: 0,
      created_at: new Date().toISOString(),
      liked: false,
    };

    posts = [created, ...posts];
    return created as T;
  }

  if (method === 'POST' && /^\/api\/mobile\/posts\/\d+\/like$/.test(pathname)) {
    const postId = Number(pathname.split('/')[4]);
    const post = posts.find((item) => item.id === postId);
    if (!post) {
      throw new Error(`Mock post not found: ${postId}`);
    }
    post.liked = !post.liked;
    post.likes_count = Math.max(0, post.likes_count + (post.liked ? 1 : -1));
    return { liked: post.liked } as T;
  }

  if (method === 'GET' && pathname === '/api/mobile/cities') {
    return cities as T;
  }

  if (method === 'GET' && pathname === '/api/mobile/circles') {
    return circles as T;
  }

  if (method === 'POST' && /^\/api\/mobile\/circles\/\d+\/join$/.test(pathname)) {
    const circleId = Number(pathname.split('/')[4]);
    circles = circles.map((circle) =>
      circle.id === circleId
        ? {
            ...circle,
            joined: !circle.joined,
            member_count: Math.max(0, circle.member_count + (circle.joined ? -1 : 1)),
          }
        : circle,
    );
    const current = circles.find((circle) => circle.id === circleId);
    if (!current) {
      throw new Error(`Mock circle not found: ${circleId}`);
    }
    return { joined: current.joined } as T;
  }

  if (method === 'GET' && pathname === '/api/mobile/moves') {
    return moves as T;
  }

  if (method === 'PATCH' && /^\/api\/mobile\/moves\/\d+\/items\/\d+$/.test(pathname)) {
    const moveId = Number(pathname.split('/')[4]);
    const itemId = Number(pathname.split('/')[6]);
    let updatedItem: ChecklistItem | null = null;

    moves = moves.map((move) => {
      if (move.id !== moveId) {
        return move;
      }
      return {
        ...move,
        checklist: move.checklist.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          updatedItem = { ...item, is_done: !item.is_done };
          return updatedItem;
        }),
      };
    });

    if (!updatedItem) {
      throw new Error(`Mock checklist item not found: ${moveId}/${itemId}`);
    }
    return updatedItem as T;
  }

  if (method === 'GET' && pathname === '/api/mobile/profile') {
    return profile as T;
  }

  throw new Error(`Mock API route not implemented: ${method} ${pathname}`);
}
