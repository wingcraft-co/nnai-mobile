import { apiRequest, getToken } from './client';

import type { Comment, Post } from '@/types/api';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'https://api.nnai.app').replace(/\/+$/, '');

type RawPost = Post & {
  image_url?: string | null;
  post_image_url?: string | null;
  postImageUrl?: string | null;
  photo_url?: string | null;
  photoUrl?: string | null;
};

function toAbsoluteMediaUrl(value?: string | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  if (/^(https?:|file:|data:|content:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `${API_BASE}${trimmed}`;
  }
  return `${API_BASE}/${trimmed.replace(/^\/+/, '')}`;
}

function normalizePost(raw: RawPost): Post {
  const picture = toAbsoluteMediaUrl(
    raw.image_url ??
      raw.post_image_url ??
      raw.postImageUrl ??
      raw.photo_url ??
      raw.photoUrl ??
      raw.picture,
  );

  return {
    ...raw,
    picture,
  };
}

export const fetchPosts = async (page = 0): Promise<Post[]> => {
  const rows = await apiRequest<RawPost[]>(`/api/mobile/posts?limit=20&offset=${page * 20}`);
  return rows.map(normalizePost);
};

export const createPost = (data: {
  title: string;
  body: string;
  tags: string[];
  city: string | null;
  picture?: string;
}): Promise<Post> =>
  apiRequest<RawPost>('/api/mobile/posts', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      image_url: data.picture ?? undefined,
      post_image_url: data.picture ?? undefined,
      picture: data.picture ?? undefined,
    }),
  }).then(normalizePost);

export async function uploadPostImage(localUri: string): Promise<string> {
  const UPLOAD_PATH = process.env.EXPO_PUBLIC_POST_IMAGE_UPLOAD_PATH || '/api/mobile/uploads/image';
  const token = await getToken();
  const devMockApiEnabled = process.env.EXPO_PUBLIC_DEV_MOCK_API === 'true';

  if (__DEV__ && (token === 'mock-token' || (devMockApiEnabled && token === 'dev-token'))) {
    return localUri;
  }

  const formData = new FormData();
  const filename = localUri.split('/').pop() || `post-${Date.now()}.jpg`;
  formData.append('file', {
    uri: localUri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}${UPLOAD_PATH}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Image upload failed (${res.status})`);
  }

  const parsed = (await res.json()) as { url?: string; image_url?: string };
  const url = parsed.url || parsed.image_url;
  if (!url) {
    throw new Error('Image upload succeeded but response has no url');
  }
  return url;
}

export const toggleLike = (postId: number): Promise<{ liked: boolean }> =>
  apiRequest(`/api/mobile/posts/${postId}/like`, { method: 'POST' });

export const fetchComments = (postId: number): Promise<Comment[]> =>
  apiRequest(`/api/mobile/posts/${postId}/comments`);

export const createComment = (postId: number, body: string): Promise<Comment> =>
  apiRequest(`/api/mobile/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
