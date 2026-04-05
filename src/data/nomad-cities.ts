export type NomadCity = {
  name: string;
  nameEn: string;
  country: string;
  countryEn: string;
  flag: string;
  lat: number;
  lng: number;
};

export const NOMAD_CITIES: NomadCity[] = [
  { name: '서울', nameEn: 'Seoul', country: '대한민국', countryEn: 'South Korea', flag: '🇰🇷', lat: 37.5665, lng: 126.978 },
  { name: '부산', nameEn: 'Busan', country: '대한민국', countryEn: 'South Korea', flag: '🇰🇷', lat: 35.1796, lng: 129.0756 },
  { name: '방콕', nameEn: 'Bangkok', country: '태국', countryEn: 'Thailand', flag: '🇹🇭', lat: 13.7563, lng: 100.5018 },
  { name: '치앙마이', nameEn: 'Chiang Mai', country: '태국', countryEn: 'Thailand', flag: '🇹🇭', lat: 18.7883, lng: 98.9853 },
  { name: '발리', nameEn: 'Bali', country: '인도네시아', countryEn: 'Indonesia', flag: '🇮🇩', lat: -8.3405, lng: 115.092 },
  { name: '자카르타', nameEn: 'Jakarta', country: '인도네시아', countryEn: 'Indonesia', flag: '🇮🇩', lat: -6.2088, lng: 106.8456 },
  { name: '쿠알라룸푸르', nameEn: 'Kuala Lumpur', country: '말레이시아', countryEn: 'Malaysia', flag: '🇲🇾', lat: 3.139, lng: 101.6869 },
  { name: '리스본', nameEn: 'Lisbon', country: '포르투갈', countryEn: 'Portugal', flag: '🇵🇹', lat: 38.7169, lng: -9.1395 },
  { name: '바르셀로나', nameEn: 'Barcelona', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', lat: 41.3851, lng: 2.1734 },
  { name: '마드리드', nameEn: 'Madrid', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', lat: 40.4168, lng: -3.7038 },
  { name: '메데진', nameEn: 'Medellin', country: '콜롬비아', countryEn: 'Colombia', flag: '🇨🇴', lat: 6.2442, lng: -75.5812 },
  { name: '도쿄', nameEn: 'Tokyo', country: '일본', countryEn: 'Japan', flag: '🇯🇵', lat: 35.6762, lng: 139.6503 },
  { name: '오사카', nameEn: 'Osaka', country: '일본', countryEn: 'Japan', flag: '🇯🇵', lat: 34.6937, lng: 135.5023 },
  { name: '싱가포르', nameEn: 'Singapore', country: '싱가포르', countryEn: 'Singapore', flag: '🇸🇬', lat: 1.3521, lng: 103.8198 },
  { name: '프라하', nameEn: 'Prague', country: '체코', countryEn: 'Czech Republic', flag: '🇨🇿', lat: 50.0755, lng: 14.4378 },
  { name: '트빌리시', nameEn: 'Tbilisi', country: '조지아', countryEn: 'Georgia', flag: '🇬🇪', lat: 41.6938, lng: 44.8015 },
  { name: '부다페스트', nameEn: 'Budapest', country: '헝가리', countryEn: 'Hungary', flag: '🇭🇺', lat: 47.4979, lng: 19.0402 },
  { name: '암스테르담', nameEn: 'Amsterdam', country: '네덜란드', countryEn: 'Netherlands', flag: '🇳🇱', lat: 52.3676, lng: 4.9041 },
  { name: '베를린', nameEn: 'Berlin', country: '독일', countryEn: 'Germany', flag: '🇩🇪', lat: 52.52, lng: 13.405 },
  { name: '멕시코시티', nameEn: 'Mexico City', country: '멕시코', countryEn: 'Mexico', flag: '🇲🇽', lat: 19.4326, lng: -99.1332 },
  { name: '부에노스아이레스', nameEn: 'Buenos Aires', country: '아르헨티나', countryEn: 'Argentina', flag: '🇦🇷', lat: -34.6037, lng: -58.3816 },
  { name: '호치민', nameEn: 'Ho Chi Minh City', country: '베트남', countryEn: 'Vietnam', flag: '🇻🇳', lat: 10.8231, lng: 106.6297 },
  { name: '하노이', nameEn: 'Hanoi', country: '베트남', countryEn: 'Vietnam', flag: '🇻🇳', lat: 21.0285, lng: 105.8542 },
  { name: '다낭', nameEn: 'Da Nang', country: '베트남', countryEn: 'Vietnam', flag: '🇻🇳', lat: 16.0544, lng: 108.2022 },
  { name: '두바이', nameEn: 'Dubai', country: 'UAE', countryEn: 'UAE', flag: '🇦🇪', lat: 25.2048, lng: 55.2708 },
  { name: '이스탄불', nameEn: 'Istanbul', country: '튀르키예', countryEn: 'Turkey', flag: '🇹🇷', lat: 41.0082, lng: 28.9784 },
  { name: '타이베이', nameEn: 'Taipei', country: '대만', countryEn: 'Taiwan', flag: '🇹🇼', lat: 25.033, lng: 121.5654 },
  { name: '런던', nameEn: 'London', country: '영국', countryEn: 'United Kingdom', flag: '🇬🇧', lat: 51.5074, lng: -0.1278 },
  { name: '파리', nameEn: 'Paris', country: '프랑스', countryEn: 'France', flag: '🇫🇷', lat: 48.8566, lng: 2.3522 },
  { name: '카이로', nameEn: 'Cairo', country: '이집트', countryEn: 'Egypt', flag: '🇪🇬', lat: 30.0444, lng: 31.2357 },
];

/** ISO-2 국가코드 → 국기 이모지 */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return '';
  return String.fromCodePoint(
    upper.charCodeAt(0) + 0x1F1A5,
    upper.charCodeAt(1) + 0x1F1A5,
  );
}

/** Character-by-character fuzzy match */
export function fuzzyMatch(str: string, query: string): boolean {
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  let si = 0;
  for (let qi = 0; qi < q.length; qi++) {
    si = s.indexOf(q[qi], si);
    if (si < 0) return false;
    si++;
  }
  return true;
}

/** 로컬 데이터에서 퍼지 검색 (즉시 결과) */
export function searchCitiesLocal(query: string): NomadCity[] {
  const q = query.trim();
  if (!q) return [];
  return NOMAD_CITIES.filter(
    (c) =>
      fuzzyMatch(c.name, q) ||
      fuzzyMatch(c.nameEn, q) ||
      fuzzyMatch(c.country, q) ||
      fuzzyMatch(c.countryEn, q),
  );
}

type GeoNamesResult = {
  geonames: Array<{
    name: string;
    countryName: string;
    countryCode: string;
    lat: string;
    lng: string;
    population: number;
  }>;
};

const GEONAMES_USERNAME = 'demo';

/** GeoNames API로 전 세계 도시 검색 */
async function searchGeoNames(query: string): Promise<NomadCity[]> {
  const url =
    `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(query)}` +
    `&featureClass=P&maxRows=10&orderby=relevance&username=${GEONAMES_USERNAME}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data: GeoNamesResult = await res.json();
  if (!data.geonames) return [];

  return data.geonames.map((g) => ({
    name: g.name,
    nameEn: g.name,
    country: g.countryName,
    countryEn: g.countryName,
    flag: countryCodeToFlag(g.countryCode),
    lat: parseFloat(g.lat),
    lng: parseFloat(g.lng),
  }));
}

/**
 * 로컬 즉시 결과 + GeoNames API 결과를 병합.
 * 로컬 매칭이 있으면 그것을 우선 표시하고, API 결과에서 중복 제거 후 추가.
 */
export async function searchCities(query: string): Promise<NomadCity[]> {
  const q = query.trim();
  if (!q) return [];

  const local = searchCitiesLocal(q);

  let remote: NomadCity[] = [];
  try {
    remote = await searchGeoNames(q);
  } catch {
    // API 실패 시 로컬 결과만 반환
  }

  // 중복 제거: 로컬에 이미 있는 도시는 API 결과에서 제외
  const localKeys = new Set(local.map((c) => `${c.nameEn.toLowerCase()}|${c.countryEn.toLowerCase()}`));
  const uniqueRemote = remote.filter(
    (c) => !localKeys.has(`${c.nameEn.toLowerCase()}|${c.countryEn.toLowerCase()}`),
  );

  return [...local, ...uniqueRemote];
}
