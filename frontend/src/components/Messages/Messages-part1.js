import logger from '../../utils/logger';
// DEPRECATED: legacy messaging UI. Do not use for new features.
// The canonical messaging UI is MessagingSystem + ConversationList + ChatWindow.
// This file contains old "isOnline" logic that was never properly wired up.

import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  ArchiveBoxIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { fetchMessages, sendMessage, markMessageAsRead, fetchProfiles, getCurrentUser } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

// Helper function to format message timestamps
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper to format dates for conversation grouping
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

const Messages = () => {
  // State management
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);

  // Load current user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user, error } = await getCurrentUser();
        if (error) {
          logger.error('Error loading user:', error);
          return;
        }
        
        if (user) {
          setCurrentUser(user);
        } else {
          toast.error('You must be logged in to use messaging');
        }
      } catch (err) {
        logger.error('Error in user loading:', err);
      }
    };
    
    loadUser();
  }, []);

  // Load profiles for messaging
  useEffect(() => {
    const loadProfiles = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const { data, error } = await fetchProfiles();
        
        if (error) {
          toast.error('Failed to load profiles');
          logger.error('Error loading profiles:', error);
          return;
        }
        
        if (data) {
          // Filter out current user
          const filteredProfiles = data.filter(profile => profile.id !== currentUser.id);
          setProfiles(filteredProfiles);
          
          // Convert profiles to conversation format
          const conversationsFromProfiles = filteredProfiles.map(profile => ({
            id: profile.id,
            name: profile.full_name || profile.email,
            avatar: profile.avatar_url || 'https://via.placeholder.com/50',
            lastMessage: '',
            timestamp: profile.created_at,
            unreadCount: 0,
            isOnline: false,
            type: 'individual',
            role: profile.job_title || 'Alumni',
            company: profile.company || ''
          }));
          
          setConversations(conversationsFromProfiles);
        }
      } catch (err) {
        logger.error('Error in profile loading:', err);
        toast.error('Something went wrong loading profiles');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfiles();
  }, [currentUser]);
