import React, { useEffect, useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fetchMyGroupsSummary } from '../../utils/supabase';
import { UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { acceptGroupInvite, rejectGroupInvite } from '../../api/groups';
import toast from 'react-hot-toast';

function MyGroupsWidget() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null); // null => loading
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      if (!user?.id) { setRows([]); setErr(null); return; }
      const { data, error } = await fetchMyGroupsSummary(3, user.id);
      if (error) { setErr(error.message || 'error'); setRows([]); return; }
      setRows(data || []);
      setErr(null);
    } catch (e) {
      setErr('Failed');
      setRows([]);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel('realtime:my-group-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload) => {
        const uid = user.id;
        if ((payload?.new && payload.new.user_id === uid) || (payload?.old && payload.old.user_id === uid)) {
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, load]);

  const Empty = () => (
    <div className="text-center py-6">
      <div className="w-12 h-12 bg-ocean-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <UsersIcon className="w-6 h-6 text-ocean-600" />
      </div>
      <h4 className="text-md font-semibold text-gray-700">No Groups/Chapters Joined</h4>
      <p className="text-sm text-gray-500 mt-1">Join a group/chapter to start networking with peers.</p>
      <Link
        to="/groups"
        className="mt-4 inline-block btn-ocean-fill text-sm py-2 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
      >
        Explore Groups/Chapters
      </Link>
    </div>
  );

  const Row = ({ g, onChange }) => {
    const archived = !!g.is_archived;
    const membershipState = g.state || 'active';
    const isPending = membershipState === 'pending';
    const isPrivate = !!g.is_private || (g.visibility && String(g.visibility).toLowerCase() === 'private');
    const linkCls = `group flex items-center gap-3 p-3 rounded-lg border hover:bg-ocean-50 hover:border-ocean-200 transition-colors ${archived ? 'opacity-60 pointer-events-none' : ''}`;

    const handleAccept = async (e) => {
      e.preventDefault();
      const toastId = toast.loading('Joining group...');
      try {
        await acceptGroupInvite(g.id);
        toast.success('Joined group', { id: toastId });
        if (onChange) await onChange();
      } catch (err) {
        toast.error('Unable to join this group right now.', { id: toastId });
      }
    };

    const handleDecline = async (e) => {
      e.preventDefault();
      const toastId = toast.loading('Declining invitation...');
      try {
        await rejectGroupInvite(g.id);
        toast.success('Invitation declined', { id: toastId });
        if (onChange) await onChange();
      } catch (err) {
        toast.error('Unable to decline invitation.', { id: toastId });
      }
    };

    const content = (
      <>
        <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
          {g.group_avatar_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={g.group_avatar_url} className="w-full h-full object-cover" />
          ) : (
            <UsersIcon className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{g.name}</div>
          <div className="mt-1 flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${isPrivate ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {isPrivate ? 'Private' : 'Public'}
              </span>
              {isPending && !archived && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100">
                  Invitation pending
                </span>
              )}
              {archived && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
              )}
            </div>
            {isPending && !archived && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-ocean-600 text-white text-xs font-medium hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2"
                  aria-label={`Accept invitation to join ${g.name}`}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                  aria-label={`Decline invitation to join ${g.name}`}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );

    return archived ? (
      <div className={linkCls} aria-disabled="true">{content}</div>
    ) : (
      <Link to={`/groups/${g.id}`} className={`${linkCls} focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}>
        {content}
      </Link>
    );
  };

  return (
    <div className="glass-card p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">My Networking Groups/Chapters</h3>

      {/* Loading */}
      {rows === null && !err && (
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-2">
            <div className="spinner spinner-md" aria-hidden="true" />
            <span className="sr-only">Loading groups...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="text-sm text-gray-500">Couldn’t load your groups/chapters.</div>
      )}

      {/* List or Empty */}
      {rows && rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.slice(0,3).map((g) => (
            <li key={g.id}>
              <Row g={g} onChange={load} />
            </li>
          ))}
        </ul>
      ) : null}

      {rows && rows.length === 0 && <Empty />}

      {/* Footer CTA */}
      {(!rows || rows.length >= 0) && (
        <div className="mt-4">
          <Link to="/groups" className="btn-ocean-outline w-full py-2 px-4 rounded-lg text-center block text-sm focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
            Explore Groups/Chapters
          </Link>
        </div>
      )}
    </div>
  );
}

export default memo(MyGroupsWidget);
