import logger from '../../utils/logger';
import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useProfileById } from '../../hooks/useProfileById';
import { getDisplayName } from '../../utils/displayName';
import Avatar from '../common/Avatar';
import { useAvatars } from '../../hooks/useAvatar';

const ThreadRow = ({ thread, selected, onSelect, avatarUrl }) => {
  const { profile, isLoading } = useProfileById(thread.other_user_id);
  const name = getDisplayName(profile, null);
  const resolvedAvatar = avatarUrl ?? profile?.avatar_url ?? null;
  
  // Green dot = connected & can send DMs (driven by backend connections.status = 'accepted')
  const isConnected = !!thread.can_send;

  return (
    <div 
      onClick={() => onSelect(thread)}
      className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 ${selected ? 'bg-gray-100' : ''}`}
    >
      <div className="flex items-center">
        <div className="relative">
          {isLoading ? (
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="spinner spinner-sm" aria-hidden="true" />
            </div>
          ) : (
            <Avatar
              src={resolvedAvatar}
              alt={name || 'avatar'}
              size={48}
              rounded="full"
            />
          )}

          {isConnected && (
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              title="Connected – you can send messages"
              aria-label="Connected – you can send messages"
            />
          )}
        </div>

        <div className="ml-4 flex-1">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h4 className="font-medium">
                {(name || '').replace(/\s*\(\d+\)\s*$/, '').trim()}
                {thread.unread_count > 0 && (
                  <span className="ml-2 inline-block w-2 h-2 bg-ocean-500 rounded-full"></span>
                )}
              </h4>
              {thread.other_user_role === 'employer' ? (
                <p className="text-xs text-gray-500 truncate">
                  {thread.other_user_company || 'Company'}
                </p>
              ) : (
                <p className="text-xs text-gray-500 truncate">
                  {[thread.other_user_title, thread.other_user_company].filter(Boolean).join(' · ')}
                </p>
              )}
              {!isConnected && thread.last_message_at && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Connection required to continue messaging
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500">{/* timestamp unavailable in view */}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConversationList = ({ 
  threads, 
  loading, 
  selectedThread, 
  onSelectThread,
  currentUser 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter conversations based on search query and sort by latest activity (newest first)
  const filteredThreads = useMemo(() => {
    const base = Array.isArray(threads)
      ? threads.filter(t => (t.other_user_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
      : [];

    const getTimestamp = (t) =>
      t.last_message_at ||
      t.latest_message_at ||
      t.last_dm_at ||
      t.updated_at ||
      t.created_at ||
      null;

    return base.slice().sort((a, b) => {
      const aTs = getTimestamp(a);
      const bTs = getTimestamp(b);
      const aTime = aTs ? new Date(aTs).getTime() : 0;
      const bTime = bTs ? new Date(bTs).getTime() : 0;
      return bTime - aTime; // newest first
    });
  }, [threads, searchQuery]);

  const otherUserIds = useMemo(
    () => (filteredThreads || []).map((t) => t.other_user_id).filter(Boolean),
    [filteredThreads]
  );

  const { avatarUrls } = useAvatars(otherUserIds, {
    useSignedUrls: true,
    autoFetch: otherUserIds.length > 0,
  });

  // Format date to relative time (e.g., "2 hours ago")
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // If date is invalid, throw an error
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      logger.error('Error formatting date:', error);
      return 'Date unavailable';
    }
  };

  // Get preview text from latest message
  const getMessagePreview = (conversation) => {
    if (!conversation.latestMessage) return '';
    
    const { content, message_type, attachment_url } = conversation.latestMessage;
    
    if (message_type === 'file') {
      return attachment_url ? 'Sent an attachment' : 'File attachment';
    }
    
    return content.length > 35 ? `${content.substring(0, 35)}...` : content;
  };

  if (loading) {
    return (
      <div className="w-full bg-white p-4 flex items-center justify-center py-12" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner spinner-lg" aria-hidden="true" />
          <p className="text-sm text-gray-500 font-medium">Loading conversations...</p>
          <span className="sr-only">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col">
      {/* Search input */}
      <div className="px-4 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-10 border rounded focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Threads list (no inner scrollbar) */}
      <div className="flex-1">
        {filteredThreads.length > 0 ? (
          filteredThreads.map((thread) => (
            <ThreadRow
              key={thread.thread_id}
              thread={thread}
              selected={selectedThread?.thread_id === thread.thread_id}
              onSelect={onSelectThread}
              avatarUrl={avatarUrls[thread.other_user_id] || null}
            />
          ))
        ) : searchQuery ? (
          // No search results
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations found</h3>
            <p className="mt-1 text-sm text-gray-500">No conversations match your search criteria.</p>
          </div>
        ) : (
          // Empty state
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
            <p className="mt-1 text-sm text-gray-500">Start a conversation with another alumni.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
