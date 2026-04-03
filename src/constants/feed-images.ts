const FEED_RESOURCE_IMAGES = [
  require('../../resources/feed/feed-1.png'),
  require('../../resources/feed/feed-2.png'),
  require('../../resources/feed/feed-3.png'),
] as const;

export function getFeedResourceImages() {
  return FEED_RESOURCE_IMAGES;
}

export function getRandomFeedResourceImage() {
  return FEED_RESOURCE_IMAGES[Math.floor(Math.random() * FEED_RESOURCE_IMAGES.length)];
}

export function getLocalFeedImageByToken(token?: string | null) {
  if (!token) return null;
  const matched = token.match(/^local:(\d+)$/);
  if (!matched) return null;
  const index = Number(matched[1]) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= FEED_RESOURCE_IMAGES.length) {
    return null;
  }
  return FEED_RESOURCE_IMAGES[index];
}

export function toLocalFeedImageToken(index: number) {
  return `local:${index + 1}`;
}
