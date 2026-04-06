export type PersonaType =
  | 'wanderer'
  | 'local'
  | 'planner'
  | 'free_spirit'
  | 'pioneer';

export type User = {
  uid: string;
  name: string;
  picture: string;
  email: string;
  persona_type: PersonaType | null;
  country?: string | null;
  country_code?: string | null;
  home_currency?: string | null;
};

export type Post = {
  id: number;
  user_id: string;
  author_level?: number;
  author: string;
  picture: string;
  title: string;
  body: string;
  tags: string[];
  city: string | null;
  likes_count: number;
  created_at: string;
  liked: boolean;
  author_persona_type: PersonaType | null;
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
  persona_type: PersonaType | null;
  country?: string | null;
  country_code?: string | null;
  home_currency?: string | null;
  badges: string[];
  stats: {
    pins: number;
    posts: number;
    circles: number;
  };
};

export type PlannerBoard = {
  id: number;
  country: string;
  city: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type PlannerTask = {
  id: number;
  board_id: number;
  text: string;
  is_done: boolean;
  due_date: string | null;
  sort_order: number;
};

export type FreeSpiritSpin = {
  spin_id: number;
  selected: {
    place_id: string;
    name: string;
    address?: string;
    rating?: number;
    lat?: number;
    lng?: number;
  };
  candidates_count: number;
};

export type WandererHopCondition = {
  id: string;
  label: string;
  is_done: boolean;
};

export type WandererHop = {
  id: number;
  from_country: string | null;
  to_country: string;
  to_city: string | null;
  note: string | null;
  target_month: string | null;
  status: 'planned' | 'booked';
  conditions: WandererHopCondition[];
  is_focus: boolean;
};

export type LocalEventRec = {
  id: number;
  source: 'google_places' | 'eventbrite' | 'ticketmaster';
  source_event_id: string;
  title: string;
  venue_name: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  starts_at: string | null;
  ends_at: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  status: 'recommended' | 'saved' | 'attended' | 'hidden';
  created_at?: string;
  updated_at?: string;
};

export type PioneerMilestone = {
  id: number;
  country: string;
  city: string | null;
  category: 'visa' | 'housing' | 'tax' | 'work' | 'language' | 'etc';
  title: string;
  status: 'todo' | 'doing' | 'done' | 'blocked';
  target_date: string | null;
  note: string | null;
};

export type CityStay = {
  id: number;
  city: string;
  country: string | null;
  arrived_at: string;        // "YYYY-MM-DD"
  left_at: string | null;    // null = 현재 도시
  visa_expires_at: string | null;
  budget_total: number | null;
  budget_remaining: number | null;
  created_at: string;
  updated_at: string;
};
