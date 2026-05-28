// src/api/comments.js
import { supabase } from '../utils/supabase'

export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from('group_comments')
    .select('id, post_id, author_id, content, created_at, edited_at, is_edited, profiles:author_id(id, full_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addComment(postId, content, groupId) {
  const trimmed = (content || '').trim()
  if (!trimmed) throw new Error('Comment cannot be empty')
  // fetch current user id for explicit user_id insert
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id || null
  try {
    const { data, error } = await supabase
      .from('group_comments')
      // Schema uses author_id; there is no group_id column. Group membership and
      // visibility are enforced via RLS using the post's group_id.
      .insert({ post_id: postId, author_id: uid, content: trimmed })
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    const code = error?.code || ''
    const msg = String(error?.message || '')
    if (code === '42501' || /can_comment_group/i.test(msg)) {
      throw new Error("You’re not allowed to comment. Please join the group first.")
    }
    throw error
  }
}

export async function editComment(commentId, content) {
  const trimmed = (content || '').trim()
  if (!trimmed) throw new Error('Comment cannot be empty')
  const { data, error } = await supabase
    .from('group_comments')
    .update({ content: trimmed })
    .eq('id', commentId)
    .select()
    .single()
  if (error) throw error
  return data
}
