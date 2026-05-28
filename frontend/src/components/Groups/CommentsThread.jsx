import React, { useEffect, useRef, useState } from 'react'
import { addComment, editComment, fetchComments } from '../../api/comments'
import { supabase } from '../../utils/supabase'
import { canCommentOnGroup, isEmployer, getGroupStatus } from '../../utils/acl'
import { useAuth } from '../../contexts/AuthContext'
import { useApproval } from '../../hooks/useApproval'
import { useAvatars } from '../../hooks/useAvatar'
import toast from 'react-hot-toast'

function timeAgo(ts) {
  const d = new Date(ts); const diff = (Date.now() - d.getTime())/1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return d.toLocaleString()
}

export default function CommentsThread({ postId, group, isMember }) {
  const { user, userRole } = useAuth()
  const { isApproved } = useApproval()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  
  // Use centralized ACL check for commenting
  // - Employers cannot comment
  // - Archived groups are read-only
  // - Both public and private groups require membership to comment
  const groupStatus = getGroupStatus(group)
  const canComment = !isEmployer(userRole) && 
    isApproved && 
    isMember && 
    canCommentOnGroup(group, userRole, isMember)
  
  const channelRef = useRef(null)

  // Fetch avatars for all comment authors
  const authorIds = comments.map(c => c.author_id || c.profiles?.id).filter(Boolean)
  const { avatarUrls } = useAvatars(authorIds, {
    useSignedUrls: true,
    autoFetch: authorIds.length > 0,
  })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchComments(postId)
      .then((rows) => mounted && setComments(rows))
      .catch((e) => {
        const msg = String(e?.message || '')
        if (/JSON object requested, multiple \(or no\) rows returned/i.test(msg)) {
          toast.error('Comments are unavailable right now.')
        } else {
          toast.error('Could not load comments.')
        }
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [postId])

  useEffect(() => {
    if (!postId) return;

    // Use a fresh per-mount channel for this post, same pattern as useDmRealtime
    const topic = `gc:${postId}:${Date.now()}`
    const ch = supabase.channel(topic)

    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_comments', filter: `post_id=eq.${postId}` },
      (payload) => {
        setComments((prev) => {
          if (payload.eventType === 'INSERT') {
            // Avoid duplicate rows when we already optimistically inserted
            // and then replaced with the saved row: if this id exists, skip.
            if (prev.some((c) => c.id === payload.new.id)) return prev
            return [...prev, payload.new]
          }
          if (payload.eventType === 'UPDATE') return prev.map(c => c.id === payload.new.id ? payload.new : c)
          if (payload.eventType === 'DELETE') return prev.filter(c => c.id !== payload.old.id)
          return prev
        })
      }
    )

    ch.subscribe()

    return () => {
      try { ch.unsubscribe() } catch (_) { void 0 }
    }
  }, [postId])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canComment) return
    const value = draft.trim()
    if (!value) return
    const optimistic = {
      id: `tmp-${Date.now()}`,
      post_id: postId,
      author_id: user?.id,
      content: value,
      created_at: new Date().toISOString(),
      edited_at: null,
      is_edited: false,
      profiles: { id: user?.id, full_name: user?.user_metadata?.full_name || 'You', avatar_url: user?.user_metadata?.avatar_url || null }
    }
    setComments((prev) => [...prev, optimistic])
    setDraft('')
    try {
      const saved = await addComment(postId, value, group?.id)
      setComments((prev) => prev.map(c => c.id === optimistic.id ? saved : c))
    } catch (err) {
      setComments((prev) => prev.filter(c => c.id !== optimistic.id))
      toast.error(err.message || 'Could not add comment')
    }
  }

  return (
    <div className="space-y-4">
      {!loading && comments.length === 0 && (
        <div className="text-sm opacity-70">No comments yet.</div>
      )}

      <ul className="space-y-3">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            avatarUrl={avatarUrls[c.author_id || c.profiles?.id] || null}
            canEdit={c.author_id === user?.id && !group?.is_archived}
            onSave={async (newContent) => {
              const prev = c
              const next = { ...c, content: newContent, is_edited: true, edited_at: new Date().toISOString() }
              setComments((arr) => arr.map(x => x.id === c.id ? next : x))
              try {
                const saved = await editComment(c.id, newContent)
                setComments((arr) => arr.map(x => x.id === c.id ? saved : x))
              } catch (err) {
                setComments((arr) => arr.map(x => x.id === c.id ? prev : x))
                toast.error(err.message || 'Could not save edit')
              }
            }}
          />
        ))}
      </ul>

      {canComment ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            maxLength={5000}
            aria-label="Write a comment"
            rows={2}
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm bg-black text-white disabled:opacity-50"
            disabled={!draft.trim()}
          >
            Comment
          </button>
        </form>
      ) : (
        <div className="text-xs opacity-70 bg-gray-50 rounded-lg p-3 border border-gray-200">
          {isEmployer(userRole) 
            ? 'Employers cannot comment on group posts.'
            : groupStatus.isArchived 
              ? 'This group is archived. Comments are read-only.' 
              : groupStatus.isRejected
                ? 'This group has been rejected. Comments are disabled.'
                : !isMember 
                  ? 'Join the group to comment on posts.'
                  : !isApproved
                    ? 'Your account is pending approval.'
                    : 'You cannot comment on this post.'}
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment, avatarUrl, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(comment.content)

  const authorName = comment?.profiles?.full_name || 'Member'
  const avatar = avatarUrl || comment?.profiles?.avatar_url || '/default-avatar.svg'

  return (
    <li className="flex gap-3">
      <img
        src={avatar || '/default-avatar.svg'}
        alt=""
        className="h-8 w-8 rounded-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/default-avatar.svg';
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{authorName}</span>
          <span className="text-xs opacity-60">{timeAgo(comment.edited_at || comment.created_at)}</span>
          {comment.is_edited && <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5">edited</span>}
        </div>

        {editing ? (
          <div className="mt-1 flex gap-2">
            <textarea
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
            />
            <div className="flex flex-col gap-2">
              <button
                className="rounded-lg px-3 py-1 text-xs bg-black text-white disabled:opacity-50"
                onClick={() => { if (text.trim()) { onSave(text); setEditing(false) } }}
                type="button"
                disabled={!text.trim()}
              >Save</button>
              <button
                className="rounded-lg px-3 py-1 text-xs border"
                onClick={() => { setText(comment.content); setEditing(false) }}
                type="button"
              >Cancel</button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        )}

        {canEdit && !editing && (
          <div className="mt-1">
            <button className="text-xs underline opacity-70 hover:opacity-100" onClick={() => setEditing(true)}>Edit</button>
          </div>
        )}
      </div>
    </li>
  )
}
