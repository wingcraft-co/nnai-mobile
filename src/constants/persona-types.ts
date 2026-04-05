import type { PersonaType } from '@/types/api';

export type PersonaActionType = 'planner' | 'free_spirit' | 'wanderer' | 'local' | 'pioneer';

export type PersonaTypeConfig = {
  label: string;
  labelKr: string;
  traitsKr: string[];
  summaryKr: string;
  color: string;
  icon: number;
  iconGif: number;
  avatar: number;
  avatarGif: number;
  actionType: PersonaActionType;
};

export const PersonaTypes: Record<PersonaType, PersonaTypeConfig> = {
  wanderer: {
    label: 'Wanderer',
    labelKr: '워렌더',
    traitsKr: ['이동', '루트 설계', '비자 동선'],
    summaryKr: '유럽 내 체류 루트를 최적화하며 국가 간 이동을 설계합니다.',
    color: '#c75a3a',
    icon: require('../../resources/character/wanderer/wanderer_64.png'),
    iconGif: require('../../resources/character/wanderer/wanderer_64.gif'),
    avatar: require('../../resources/character/wanderer/wanderer.png'),
    avatarGif: require('../../resources/character/wanderer/wanderer.gif'),
    actionType: 'wanderer',
  },
  local: {
    label: 'Local',
    labelKr: '로컬',
    traitsKr: ['리듬', '지속성', '로컬 적응'],
    summaryKr: '도시의 리듬에 맞춰 천천히 적응하며 안정적으로 생활합니다.',
    color: '#b07cc6',
    icon: require('../../resources/character/local/local_64.png'),
    iconGif: require('../../resources/character/local/local_64.gif'),
    avatar: require('../../resources/character/local/local.png'),
    avatarGif: require('../../resources/character/local/local.gif'),
    actionType: 'local',
  },
  planner: {
    label: 'Planner',
    labelKr: '플래너',
    traitsKr: ['비용 최적화', '계획', '효율'],
    summaryKr: '수치와 계획 중심으로 체류 전략을 최적화합니다.',
    color: '#4a7ab5',
    icon: require('../../resources/character/planner/planner_64.png'),
    iconGif: require('../../resources/character/planner/planner_64.gif'),
    avatar: require('../../resources/character/planner/planner.png'),
    avatarGif: require('../../resources/character/planner/planner.gif'),
    actionType: 'planner',
  },
  free_spirit: {
    label: 'Free Spirit',
    labelKr: '프리 스피릿',
    traitsKr: ['회복', '가벼운 연결', '균형'],
    summaryKr: '무리 없는 루틴과 주변 연결을 통해 회복 중심의 생활을 만듭니다.',
    color: '#4eba8a',
    icon: require('../../resources/character/free_spirit/free_spirit_64.png'),
    iconGif: require('../../resources/character/free_spirit/free_spirit_64.gif'),
    avatar: require('../../resources/character/free_spirit/free_spirit.png'),
    avatarGif: require('../../resources/character/free_spirit/free_spirit.gif'),
    actionType: 'free_spirit',
  },
  pioneer: {
    label: 'Pioneer',
    labelKr: '파이오니어',
    traitsKr: ['정착', '자립', '장기 전략'],
    summaryKr: '현지 정착을 전제로 장기 이주 전략을 세웁니다.',
    color: '#d4a020',
    icon: require('../../resources/character/pioneer/pioneer_64.png'),
    iconGif: require('../../resources/character/pioneer/pioneer_64.gif'),
    avatar: require('../../resources/character/pioneer/pioneer.png'),
    avatarGif: require('../../resources/character/pioneer/pioneer.gif'),
    actionType: 'pioneer',
  },
};

export const EarthAssets = {
  logo: require('../../resources/character/earth/earth_64.png'),
  logoGif: require('../../resources/character/earth/earth_64.gif'),
  full: require('../../resources/character/earth/earth.png'),
  fullGif: require('../../resources/character/earth/earth.gif'),
};

export function getPersonaTypeConfig(type: PersonaType | null): PersonaTypeConfig | null {
  if (!type) return null;
  return PersonaTypes[type] ?? null;
}
