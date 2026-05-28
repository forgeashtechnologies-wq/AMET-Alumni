import { useAuth } from '../contexts/AuthContext';
import { useMyProfile } from './useMyProfile';
import { getDisplayName } from '../utils/displayName';
import { useAvatar } from './useAvatar';

export function useCurrentUserIdentity() {
  const { user } = useAuth();
  const uid = user?.id;
  const { data: profile, isLoading: profileLoading } = useMyProfile(uid);
  const { avatarUrl, loading: avatarLoading } = useAvatar(uid, { autoFetch: !!uid });
  const name = getDisplayName(profile, user);
  const isLoading = profileLoading || avatarLoading;
  return { uid, name, avatarUrl, profile, isLoading };
}
