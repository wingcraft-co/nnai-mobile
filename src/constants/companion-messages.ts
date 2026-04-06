export type CompanionContext =
  | 'feed'
  | 'feed_empty'
  | 'city'
  | 'me'
  | 'post_created'
  | 'liked';

const messagesKr: Record<CompanionContext, string[]> = {
  feed: ['새 포스트가 있어!', '오늘 뭘 써볼까?', '피드를 구경해봐~'],
  feed_empty: ['아직 포스트가 없어~', '첫 글을 써봐!'],
  city: ['새 도시를 탐험해봐!', '여긴 어때?', '다음 목적지를 찾아보자!'],
  me: ['오늘도 열심히!', '다음 도시는 어디?', '멋진 여정이야!'],
  post_created: ['좋은 글이야!', '공유해줘서 고마워!'],
  liked: ['나도 좋아!', '좋은 취향이야!'],
};

const messagesEn: Record<CompanionContext, string[]> = {
  feed: ['New posts are here!', 'What will you write today?', 'Check out the feed~'],
  feed_empty: ['No posts yet~', 'Write your first one!'],
  city: ['Explore a new city!', 'How about this one?', "Let's find your next destination!"],
  me: ['Keep it up!', "Where's next?", 'What a journey!'],
  post_created: ['Nice post!', 'Thanks for sharing!'],
  liked: ['I like it too!', 'Great taste!'],
};

export function getCompanionMessage(context: CompanionContext, isKorean: boolean): string {
  const messages = isKorean ? messagesKr[context] : messagesEn[context];
  return messages[Math.floor(Math.random() * messages.length)];
}
