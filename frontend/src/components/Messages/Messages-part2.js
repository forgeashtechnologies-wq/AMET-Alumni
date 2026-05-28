import logger from '../../utils/logger';
// DEPRECATED: legacy messaging UI. Do not use for new features.
// The canonical messaging UI is MessagingSystem + ConversationList + ChatWindow.

  // Load messages when a conversation is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation || !currentUser) return;
      
      setLoading(true);
      try {
        const { data, error } = await fetchMessages(currentUser.id);
        
        if (error) {
          toast.error('Failed to load messages');
          logger.error('Error loading messages:', error);
          return;
        }
        
        if (data) {
          // Filter messages for the selected conversation
          const conversationMessages = data.filter(
            message => 
              (message.sender_id === selectedConversation && message.recipient_id === currentUser.id) || 
              (message.sender_id === currentUser.id && message.recipient_id === selectedConversation)
          );
          
          // Sort by timestamp ascending (oldest first)
          conversationMessages.sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          
          // Map to UI format
          const formattedMessages = conversationMessages.map(message => ({
            id: message.id,
            senderId: message.sender_id,
            senderName: message.sender?.full_name || 'User',
            senderAvatar: message.sender?.avatar_url || 'https://via.placeholder.com/40',
            message: message.content,
            timestamp: message.created_at,
            isOwn: message.sender_id === currentUser.id,
            isRead: message.is_read
          }));
          
          setMessages(formattedMessages);
          
          // Mark unread messages as read
          const unreadMessages = conversationMessages.filter(
            message => !message.is_read && message.recipient_id === currentUser.id
          );
          
          if (unreadMessages.length > 0) {
            unreadMessages.forEach(async (message) => {
              await markMessageAsRead(message.id);
            });
          }
        }
      } catch (err) {
        logger.error('Error in message loading:', err);
        toast.error('Something went wrong loading messages');
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [selectedConversation, currentUser]);
  
  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;
    
    try {
      // Create message data
      const messageData = {
        sender_id: currentUser.id,
        recipient_id: selectedConversation,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        is_read: false
      };
      
      // Optimistically update UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.full_name || currentUser.email,
        senderAvatar: currentUser.avatar_url || 'https://via.placeholder.com/40',
        message: newMessage.trim(),
        timestamp: new Date().toISOString(),
        isOwn: true,
        isRead: false,
        isPending: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      
      // Send message to Supabase
      const { data, error } = await sendMessage(messageData);
      
      if (error) {
        toast.error('Failed to send message');
        logger.error('Error sending message:', error);
        
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(optimisticMessage.message); // Restore draft
        return;
      }
      
      if (data) {
        // Replace optimistic message with real one
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        
        const realMessage = {
          id: data.id,
          senderId: data.sender_id,
          senderName: currentUser.full_name || currentUser.email,
          senderAvatar: currentUser.avatar_url || 'https://via.placeholder.com/40',
          message: data.content,
          timestamp: data.created_at,
          isOwn: true,
          isRead: false
        };
        
        setMessages(prev => [...prev, realMessage]);
      }
    } catch (err) {
      logger.error('Error in send message:', err);
      toast.error('Something went wrong sending your message');
    }
  };
