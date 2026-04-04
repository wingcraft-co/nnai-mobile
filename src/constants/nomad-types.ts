import type { NomadType } from '@/types/api';

export type NomadTypeConfig = {
  label: string;
  labelKr: string;
  traitsKr: string[];
  summaryKr: string;
  color: string;
  icon: number;
  iconGif: number;
  avatar: number;
  avatarGif: number;
};

export const NomadTypes: Record<NomadType, NomadTypeConfig> = {
  free_spirit: {
    label: 'Free Spirit',
    labelKr: '자유로운 영혼',
    traitsKr: ['여유로움', '느긋함', '자아성찰'],
    summaryKr:
      '오늘 뭘 했는지 딱히 말하기 어려운데, 이상하게 만족스러운 날이 있어요. 계획대로 된 하루보다 그런 날이 더 좋아요.',
    color: '#b07cc6',
    icon: require('../../resources/character/free_spirit/free_spirit_64.png'),
    iconGif: require('../../resources/character/free_spirit/free_spirit_64.gif'),
    avatar: require('../../resources/character/free_spirit/free_spirit.png'),
    avatarGif: require('../../resources/character/free_spirit/free_spirit.gif'),
  },
  local: {
    label: 'Local',
    labelKr: '어디서든 현지인',
    traitsKr: ['정착형', '친구', '인간관계'],
    summaryKr:
      '먼저 다가가는 편은 아닌데, 어느새 이름을 부르는 사이가 되어 있어요. 사람이 생기면, 그 도시가 달라 보이거든요.',
    color: '#4eba8a',
    icon: require('../../resources/character/local/local_64.png'),
    iconGif: require('../../resources/character/local/local_64.gif'),
    avatar: require('../../resources/character/local/local.png'),
    avatarGif: require('../../resources/character/local/local.gif'),
  },
  pioneer: {
    label: 'Pioneer',
    labelKr: '용감한 개척자',
    traitsKr: ['이민/이주 희망', '의지', '굳건함'],
    summaryKr:
      '여행 중에 문득, 여기 살아도 되겠다 싶은 순간이 와요. 근데 그 생각이 그냥 스치지 않아요. 어떻게 하면 될지 벌써 찾아보고 있어요.',
    color: '#d4a020',
    icon: require('../../resources/character/pioneer/pioneer_64.png'),
    iconGif: require('../../resources/character/pioneer/pioneer_64.gif'),
    avatar: require('../../resources/character/pioneer/pioneer.png'),
    avatarGif: require('../../resources/character/pioneer/pioneer.gif'),
  },
  planner: {
    label: 'Planner',
    labelKr: '영리한 설계자',
    traitsKr: ['현실적', '가성비', '합리적'],
    summaryKr:
      '예쁜 곳보다 살기 좋은 곳이 좋아요. 설명하기는 어렵지만, 여기서 살면 어떨지 금방 느껴져요. 그 감이 틀린 적이 별로 없어요.',
    color: '#4a7ab5',
    icon: require('../../resources/character/planner/planner_64.png'),
    iconGif: require('../../resources/character/planner/planner_64.gif'),
    avatar: require('../../resources/character/planner/planner.png'),
    avatarGif: require('../../resources/character/planner/planner.gif'),
  },
  wanderer: {
    label: 'Wanderer',
    labelKr: '거침없는 나그네',
    traitsKr: ['역마살', '이동', '호기심'],
    summaryKr:
      '한 곳에 익숙해지는 순간, 설레임보다 아쉬움이 먼저 와요. 더 보고 싶고, 더 느끼고 싶어요. 많이 돌아다닐수록 내가 더 넓어지는 것 같아서요.',
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
