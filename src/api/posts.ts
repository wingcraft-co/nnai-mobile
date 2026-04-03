import { apiRequest } from './client';

import type { Comment, Post } from '@/types/api';

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
