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
];

const profile: Profile = {
  uid: 'dev',
  name: tx('개발 사용자', 'Dev User'),
  picture: '',
  email: 'dev@nnai.app',
  badges: [tx('얼리 노마드', 'Early Nomad'), tx('서클 호스트', 'Circle Host')],
  stats: {
    pins: 6,
    posts: 18,
    circles: 2,
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
