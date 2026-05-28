import { supabase } from '../utils/supabase';
import logger from '../utils/logger';

class AvatarService {
  // Get avatar URL for a single user (optionally via RPC)
  static async getAvatarUrl(userId, useSignedUrl = false) {
    if (!userId) return null;

    try {
      if (useSignedUrl) {
        // Primary path: signed URL RPC
        try {
          const { data, error } = await supabase.rpc('get_signed_avatar_url', {
            p_user_id: userId,
          });

          if (!error && data) {
            return data || null;
          }

          if (error) {
            logger.error('[AvatarService] getAvatarUrl RPC error', error);
          }
        } catch (rpcErr) {
          logger.error('[AvatarService] getAvatarUrl RPC threw', rpcErr);
        }

        // Fallback: read directly from profiles.avatar_url so UI keeps working
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('[AvatarService] getAvatarUrl fallback error', error);
        return null;
      }

      return data?.avatar_url || null;
    } catch (err) {
      logger.error('[AvatarService] getAvatarUrl unexpected error', err);
      return null;
    }
  }

  // Batch avatar URLs for multiple users
  static async getAvatarUrls(userIds, useSignedUrls = false) {
    if (!Array.isArray(userIds) || userIds.length === 0) return {};

    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    try {
      if (useSignedUrls) {
        // Primary path: signed URL RPC
        try {
          const { data, error } = await supabase.rpc('get_signed_avatar_urls', {
            p_user_ids: uniqueIds,
          });

          if (!error && Array.isArray(data)) {
            const rows = data;
            const map = {};
            for (const row of rows) {
              if (!row) continue;
              map[row.user_id] = row.avatar_url || null;
            }

            // If we obtained any rows, use them; otherwise fall through to DB fallback
            if (Object.keys(map).length > 0 || rows.length > 0) {
              return map;
            }
          }

          if (error) {
            logger.error('[AvatarService] getAvatarUrls RPC error', error);
          }
        } catch (rpcErr) {
          logger.error('[AvatarService] getAvatarUrls RPC threw', rpcErr);
        }
        // If RPC failed or returned nothing useful, fall through to profiles table
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', uniqueIds);

      if (error) {
        logger.error('[AvatarService] getAvatarUrls fallback error', error);
        return {};
      }

      const rows = Array.isArray(data) ? data : [];
      const map = {};
      for (const row of rows) {
        if (!row) continue;
        map[row.id] = row.avatar_url || null;
      }
      return map;
    } catch (err) {
      logger.error('[AvatarService] getAvatarUrls unexpected error', err);
      return {};
    }
  }

  // Upload a new avatar for the current user
  static async uploadAvatar(file, options = {}) {
    if (!file) {
      throw new Error('No file provided for avatar upload.');
    }

    const { maxSizeMB = 2 } = options;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      logger.error('[AvatarService] uploadAvatar auth error', authError);
      throw new Error('Not authenticated');
    }

    const userId = authData.user.id;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please select a valid image file (JPEG, PNG, or WebP).');
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`Image size should be less than ${maxSizeMB}MB`);
    }

    const originalName = file.name || 'avatar';
    const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `${userId}/${Date.now()}.${ext}`;

    logger.info(`[AvatarService] Uploading avatar to avatars/${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('[AvatarService] uploadAvatar storage error', uploadError);
      throw new Error(uploadError.message || 'Failed to upload avatar');
    }

    const { error: rpcError } = await supabase.rpc('update_user_avatar', {
      p_file_path: filePath,
    });

    if (rpcError) {
      logger.error('[AvatarService] uploadAvatar RPC error', rpcError);
      try {
        await supabase.storage.from('avatars').remove([filePath]);
      } catch (rollbackErr) {
        logger.error('[AvatarService] uploadAvatar rollback failed', rollbackErr);
      }
      throw new Error(rpcError.message || 'Failed to update avatar metadata');
    }

    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl || null;

    return { filePath, publicUrl };
  }

  // Clear current user's avatar metadata
  static async deleteAvatar() {
    const { error } = await supabase.rpc('delete_user_avatar');
    if (error) {
      logger.error('[AvatarService] deleteAvatar error', error);
      throw new Error(error.message || 'Failed to delete avatar');
    }
  }

  // Admin-only helper to fetch another user's avatar URL
  static async adminGetAvatar(userId) {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('admin_get_avatar', {
      p_user_id: userId,
    });
    if (error) {
      logger.error('[AvatarService] adminGetAvatar error', error);
      throw new Error(error.message || 'Failed to fetch user avatar');
    }
    return data || null;
  }
}

export default AvatarService;
