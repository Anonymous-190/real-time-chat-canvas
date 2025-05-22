
import { Chat, Message, User } from '@/types/chat';

export interface ChatsContextProps {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  users: User[];
  setCurrentChat: (chat: Chat | null) => void;
  sendMessage: (content: string, attachment?: File) => Promise<void>;
  loading: boolean;
  filterChats: (query: string) => void;
  filteredChats: Chat[];
}
