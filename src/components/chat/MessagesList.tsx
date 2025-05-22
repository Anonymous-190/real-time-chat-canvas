
import { useChats } from "@/context/ChatsContext";
import { useAuth } from "@/context/AuthContext";
import { Message } from "@/types/chat";
import { useState, useEffect, useRef } from "react";
import { File, Image } from "lucide-react";

export function MessagesList() {
  const { messages, users, currentChat } = useChats();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderAttachment = (message: Message) => {
    if (!message.attachment_url) return null;
    
    switch (message.attachment_type) {
      case 'image':
        return (
          <div className="mt-2 mb-1 rounded overflow-hidden max-w-xs">
            <img 
              src={message.attachment_url} 
              alt="Image attachment" 
              className="max-w-full h-auto object-contain"
              onLoad={() => messagesEndRef.current?.scrollIntoView()}
            />
          </div>
        );
      case 'video':
        return (
          <div className="mt-2 mb-1 rounded overflow-hidden max-w-xs">
            <video 
              src={message.attachment_url} 
              controls 
              className="max-w-full h-auto"
              onLoadedMetadata={() => messagesEndRef.current?.scrollIntoView()}
            />
          </div>
        );
      default:
        return (
          <a 
            href={message.attachment_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-2 mb-1 flex items-center p-2 bg-white rounded border text-blue-600 hover:text-blue-800"
          >
            <File className="h-4 w-4 mr-2" />
            <span className="text-xs truncate">Download attachment</span>
          </a>
        );
    }
  };

  const renderMessages = () => {
    let lastDateStr: string | null = null;
    
    return messages.map((message, index) => {
      const isCurrentUser = message.sender_id === user?.id;
      const sender = users.find(u => u.id === message.sender_id);
      
      // Check if we need to display a date divider
      const currentDateStr = formatDate(message.created_at);
      const showDateDivider = lastDateStr !== currentDateStr;
      lastDateStr = currentDateStr;

      return (
        <div key={message.id}>
          {showDateDivider && (
            <div className="flex justify-center my-2">
              <div className="bg-gray-200 text-xs text-gray-600 px-2 py-1 rounded-full">
                {currentDateStr}
              </div>
            </div>
          )}
          <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
            <div 
              className={`rounded-lg px-4 py-2 max-w-[70%] ${
                isCurrentUser 
                  ? 'bg-chat-bubble-sent text-black rounded-tr-none' 
                  : 'bg-chat-bubble-received text-black rounded-tl-none'
              }`}
            >
              {currentChat?.is_group && !isCurrentUser && (
                <p className="text-xs font-medium text-whatsapp-teal mb-1">
                  {sender?.display_name || 'Unknown User'}
                </p>
              )}
              {message.content && <p className="text-sm">{message.content}</p>}
              {renderAttachment(message)}
              <p className="text-[10px] text-gray-600 text-right mt-1">
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex-grow overflow-y-auto p-4 bg-chat-bg">
      {!currentChat ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-600">Welcome to Chat</h3>
            <p className="text-gray-500 mt-2">Select a conversation to start chatting</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-600">No messages yet</h3>
            <p className="text-gray-500 mt-2">Start the conversation!</p>
          </div>
        </div>
      ) : (
        renderMessages()
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
