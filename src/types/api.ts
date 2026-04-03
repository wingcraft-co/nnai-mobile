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
