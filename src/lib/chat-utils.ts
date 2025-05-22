
import { Chat, Message, User } from "@/types/chat";

// Format message time for display
export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

// Format relative date (Today, Yesterday, or date)
export const formatRelativeDate = (dateString: string): string => {
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

// Get user initials for avatar fallbacks
export const getUserInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Get message preview text (truncated)
export const getMessagePreview = (content: string, maxLength = 30): string => {
  if (!content) return "";
  return content.length > maxLength 
    ? `${content.substring(0, maxLength)}...` 
    : content;
};

// Sort chats by most recent activity
export const sortChatsByRecent = (chats: Chat[]): Chat[] => {
  return [...chats].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
};

// Count unread messages
export const countUnreadMessages = (messages: Message[], userId: string, lastReadTime?: string): number => {
  if (!lastReadTime) return 0;
  
  const lastReadDate = new Date(lastReadTime);
  return messages.filter(msg => 
    msg.sender_id !== userId && 
    new Date(msg.created_at) > lastReadDate
  ).length;
};

// Find chat participants excluding current user
export const getChatParticipants = (users: User[], chatMembers: {user_id: string}[], currentUserId: string): User[] => {
  const participantIds = chatMembers
    .filter(member => member.user_id !== currentUserId)
    .map(member => member.user_id);
    
  return users.filter(user => participantIds.includes(user.id));
};
