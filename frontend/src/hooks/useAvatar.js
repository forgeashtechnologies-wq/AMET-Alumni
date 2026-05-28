import { useQuery } from '@tanstack/react-query';
import AvatarService from '../services/avatar';
import logger from '../utils/logger';

/**
 * React hook for a single user's avatar.
 *
 * @param {string|null} userId
 * @param {{ useSignedUrl?: boolean, autoFetch?: boolean }} options
 * @returns {{ avatarUrl: string|null, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export const useAvatar = (userId, options = {}) => {
  const { useSignedUrl = false, autoFetch = true } = options;

  const enabled = autoFetch && !!userId;

  const query = useQuery({
    queryKey: ['avatar', { userId, useSignedUrl }],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;
      try {
        const url = await AvatarService.getAvatarUrl(userId, useSignedUrl);
        return url || null;
      } catch (err) {
        // eslint-disable-next-line no-console
        logger.error('[useAvatar] fetchAvatar error', err);
        throw err;
      }
    },
  });

  return {
    avatarUrl: query.data || null,
    loading: query.isLoading,
    error: query.error ? (query.error.message || 'Unknown error') : null,
    refetch: query.refetch,
  };
};

/**
 * React hook for multiple users' avatars.
 *
 * @param {string[]|null} userIds
 * @param {{ useSignedUrls?: boolean, autoFetch?: boolean }} options
 * @returns {{ avatarUrls: Record<string,string|null>, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export const useAvatars = (userIds, options = {}) => {
  const { useSignedUrls = false, autoFetch = true } = options;

  const hasIds = Array.isArray(userIds) && userIds.length > 0;
  const enabled = autoFetch && hasIds;

  const query = useQuery({
    queryKey: ['avatars', { userIds: hasIds ? Array.from(new Set(userIds.filter(Boolean))) : [], useSignedUrls }],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!hasIds) return {};
      try {
        const ids = Array.from(new Set(userIds.filter(Boolean)));
        const map = await AvatarService.getAvatarUrls(ids, useSignedUrls);
        return map || {};
      } catch (err) {
        // eslint-disable-next-line no-console
        logger.error('[useAvatars] fetchAvatars error', err);
        throw err;
      }
    },
  });

  return {
    avatarUrls: query.data || {},
    loading: query.isLoading,
    error: query.error ? (query.error.message || 'Unknown error') : null,
    refetch: query.refetch,
  };
};
