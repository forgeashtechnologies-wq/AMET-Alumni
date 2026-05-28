import React from 'react';
import { useProfileById } from '../../hooks/useProfileById';
import { getDisplayName } from '../../utils/displayName';
import Avatar from './Avatar';
import { useAvatar } from '../../hooks/useAvatar';

export default function ProfilePreview({ userId, user = null, size = 48, className = '' }) {
  const { profile, isLoading } = useProfileById(userId);
  const { avatarUrl: hookAvatarUrl } = useAvatar(userId, {
    useSignedUrl: true,
    autoFetch: !!userId,
  });
  const name = getDisplayName(profile, user);
  const avatarUrl = profile?.avatar_url ?? null;
  const resolvedAvatar = hookAvatarUrl || avatarUrl || null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {isLoading ? (
        <div className="rounded-full bg-gray-200 animate-pulse" style={{ width: size, height: size }} />
      ) : (
        <Avatar
          src={resolvedAvatar}
          alt={name || 'avatar'}
          size={size}
          rounded="full"
        />
      )}
      <span className="truncate text-sm font-medium">{isLoading ? '—' : name}</span>
    </div>
  );
}
