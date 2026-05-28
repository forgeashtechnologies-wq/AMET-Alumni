import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { canCreateGroup } from '../../utils/acl';
import { createGroup, updateGroupAvatarRpc, setAdminOnlyPosts } from '../../api/groups';
import logger from '../../utils/logger';
import { getFriendlyErrorMessage } from '../../utils/errors';

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [adminOnlyPosts, setAdminOnlyPosts] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !canCreateGroup(userRole)) {
      toast.error('You are not allowed to create a group.');
      navigate('/groups');
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Group name is required.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating your group...');

    try {
      const nameToCheck = name.trim();
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const id = await createGroup({
        name: nameToCheck,
        description: description.trim(),
        isPrivate,
        tags,
      });

      // Set admin-only posts if requested
      if (adminOnlyPosts && id) {
        try {
          await setAdminOnlyPosts(id, true);
        } catch (flagErr) {
          logger.warn('Failed to set admin-only posts flag:', flagErr);
        }
      }

      // Optional avatar upload after group creation
      if (avatarFile && id) {
        try {
          // Validate image type and size (max 2MB)
          const ACCEPT = ['image/jpeg', 'image/png'];
          if (!ACCEPT.includes(avatarFile.type)) {
            toast.error('Only JPG or PNG images are allowed.', { id: toastId });
            setLoading(false);
            return;
          }
          const MAX = 2 * 1024 * 1024; // 2MB
          if (avatarFile.size > MAX) {
            toast.error('Image must be 2 MB or smaller.', { id: toastId });
            setLoading(false);
            return;
          }
          const filePath = `${id}/avatar.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('group_avatars')
            .upload(filePath, avatarFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: avatarFile.type || 'image/jpeg',
            });

          if (uploadError) {
            logger.warn('Avatar upload failed:', uploadError);
            // Don't fail the whole operation for avatar upload failure
          } else {
            // Persist URL via RPC so RLS and helper enforce permissions
            const { data: pub } = supabase.storage
              .from('group_avatars')
              .getPublicUrl(filePath);
            try {
              await updateGroupAvatarRpc(id, pub?.publicUrl || null);
            } catch (updErr) {
              logger.warn('Failed to persist group avatar URL via RPC:', updErr);
            }
          }
        } catch (uploadErr) {
          logger.warn('Avatar upload error:', uploadErr);
        }
      }

      toast.success('Group created successfully!', { id: toastId });
      navigate(`/groups/${id}/manage`);
    } catch (err) {
      logger.error("Error creating group:", err);
      const code = String(err?.code || '');
      const msg = String(`${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`);
      if (code === '42901' || /rate_limit/i.test(msg)) {
        if (/group_create/i.test(msg)) {
          const limit = userRole === 'admin' || userRole === 'super_admin' ? 50 : 5;
          toast.error(`You have reached the daily group creation limit (${limit} per day). Please try again tomorrow.`, { id: toastId });
        } else {
          toast.error(getFriendlyErrorMessage(err, 'Too many requests. Please try again later.'), { id: toastId });
        }
      } else if (code === '23505' && /uq_groups_name_norm_active|name_norm/i.test(msg)) {
        toast.error('A group with this name already exists. Please choose a different name.', { id: toastId });
      } else if (/JSON object requested, multiple \(or no\) rows returned/i.test(msg)) {
        toast.error('Group created but is not visible yet. It may be pending review.', { id: toastId });
      } else if (/permission denied|42501/i.test(msg)) {
        toast.error("You don't have permission to create a group.", { id: toastId });
      } else {
        toast.error(getFriendlyErrorMessage(err, 'Unable to create group. Please try again.'), { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups/Chapters
        </button>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Create a New Group/Chapter</h1>
            <p className="text-gray-500 mb-2">Start a new community for alumni to connect and collaborate.</p>
            <p className="text-xs text-gray-500 mb-8">Note: New groups/chapters may require admin approval before appearing publicly.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="e.g., Marine Engineering Alumni"
                  required
                />
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <h3 className="font-medium text-gray-800">Admin-only Posts</h3>
                  <p className="text-sm text-gray-500">
                    When enabled, only group admins can create posts. Members can still view and comment if allowed by group settings.
                  </p>
                </div>
                <label htmlFor="adminOnlyPosts" className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="adminOnlyPosts"
                    checked={adminOnlyPosts}
                    onChange={(e) => setAdminOnlyPosts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative shrink-0 w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900 select-none">
                    {adminOnlyPosts ? 'Admins only' : 'Admins + members'}
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition h-32"
                  placeholder="What is this group about?"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Comma-separated tags, e.g., alumni,engineering,marine"
                />
                <p className="text-xs text-gray-500 mt-1">Use commas to separate tags. Example: alumni, engineering, marine</p>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <h3 className="font-medium text-gray-800">Group Privacy</h3>
                  <p className="text-sm text-gray-500">
                    Default is <span className="font-semibold">public</span>. Turn this on to make the group
                    <span className="font-semibold"> private</span> and invite-only.
                  </p>
                </div>
                <label htmlFor="isPrivate" className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {isPrivate ? 'Private' : 'Public'}
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
                  Group Avatar (optional)
                </label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1">PNG or JPG up to 5 MB.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? 'Creating Group/Chapter...' : 'Create Group/Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
