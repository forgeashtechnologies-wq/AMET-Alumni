// DEPRECATED: legacy messaging UI. Do not use for new features.
// The canonical messaging UI is MessagingSystem + ConversationList + ChatWindow.
// This file attempted to show a green "isOnline" dot but it was never wired up.

  // Get selected conversation data
  const selectedConversationData = selectedConversation 
    ? conversations.find(c => c.id === selectedConversation) 
    : null;
    
  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex h-screen bg-white">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input w-full pl-10 py-2 rounded-lg"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conversation.id ? 'bg-ocean-50 border-r-2 border-ocean-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <img 
                      src={conversation.avatar} 
                      alt={conversation.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.name}
                      </h3>
                      {conversation.timestamp && (
                        <p className="text-xs text-gray-500">
                          {formatTime(conversation.timestamp)}
                        </p>
                      )}
                    </div>
                    
                    {conversation.type === 'group' ? (
                      <p className="text-xs text-gray-500 mb-1">
                        {conversation.members} members • {conversation.category}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mb-1">
                        {conversation.role} {conversation.company ? `at ${conversation.company}` : ''}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={selectedConversationData.avatar}
                      alt={selectedConversationData.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {selectedConversationData.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-gray-900">{selectedConversationData.name}</h2>
                    {selectedConversationData.type === 'group' ? (
                      <p className="text-sm text-gray-500">
                        {selectedConversationData.members} members
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {selectedConversationData.isOnline ? 'Online' : 'Offline'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedConversationData.type === 'individual' && (
                    <>
                      <button className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
                        <PhoneIcon className="w-5 h-5" />
                      </button>
                      <button className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
                        <VideoCameraIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
                    <InformationCircleIcon className="w-5 h-5" />
                  </button>
                  <button className="inline-flex items-center justify-center w-[44px] h-[44px] p-0 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2">
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex space-x-2 max-w-xs lg:max-w-md ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {!message.isOwn && (
                        <img 
                          src={message.senderAvatar} 
                          alt={message.senderName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <div className={`px-4 py-2 rounded-lg ${
                        message.isOwn 
                          ? 'bg-ocean-500 text-white' 
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.isOwn ? 'text-ocean-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      className="form-input w-full pr-20 py-3 rounded-lg resize-none"
                      rows="1"
                      placeholder="Type a message..."
                    />
                    <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <PaperClipIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <FaceSmileIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="btn-ocean p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
              <p className="text-gray-600">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
