export const qk = {
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (id: string) => ['groups', id, 'members'] as const,
  requests: (id: string) => ['groups', id, 'requests'] as const,
  posts: (id: string) => ['groups', id, 'posts'] as const,
  comments: (postId: string) => ['posts', postId, 'comments'] as const,
};
