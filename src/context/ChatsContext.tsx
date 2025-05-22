
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Chat, Message, User } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

interface ChatsContextProps {
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

const ChatsContext = createContext<ChatsContextProps | undefined>(undefined);

const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    display_name: 'Periskope',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    created_at: new Date().toISOString(),
    phone_number: '+919718 44008',
    status: 'online',
  },
  {
    id: '2',
    email: 'user2@example.com',
    display_name: 'Roshnag Airtel',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    created_at: new Date().toISOString(),
    phone_number: '+91 63646 47925',
  },
];

// Generate mock chats
const mockChats: Chat[] = [
  {
    id: '1',
    name: 'Test Skope Final 5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_group: false,
    type: 'demo',
    unread_count: 0,
  },
  {
    id: '2',
    name: 'Periskope Team Chat',
    created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    updated_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    is_group: true,
    type: 'internal',
    unread_count: 0,
  },
  {
    id: '3',
    name: '+91 99999 99999',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_group: false,
    type: 'signup',
    unread_count: 0,
  },
  {
    id: '4',
    name: 'Test Demo17',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_group: false,
    type: 'content',
    unread_count: 0,
  },
  {
    id: '5',
    name: 'Test El Centro',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_group: true,
    type: 'demo',
    unread_count: 0,
  },
];

// Generate mock messages
const generateMockMessages = (chatId: string): Message[] => {
  const mockMessages: Message[] = [];
  const baseDate = new Date();
  
  // Add some messages for chat 2
  if (chatId === '2') {
    mockMessages.push({
      id: '201',
      chat_id: '2',
      sender_id: '1',
      content: 'hello',
      created_at: new Date(baseDate.setMinutes(baseDate.getMinutes() - 5)).toISOString(),
    });
  }
  
  // Add messages for chat 5
  if (chatId === '5') {
    mockMessages.push({
      id: '501',
      chat_id: '5',
      sender_id: '1',
      content: 'test el centro',
      created_at: new Date(baseDate.setMinutes(baseDate.getMinutes() - 10)).toISOString(),
    });
    mockMessages.push({
      id: '502',
      chat_id: '5',
      sender_id: '2',
      content: 'Hello, Livonia!',
      created_at: new Date(baseDate.setMinutes(baseDate.getMinutes() - 20)).toISOString(),
    });
  }
  
  return mockMessages;
};

export const ChatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [filteredChats, setFilteredChats] = useState<Chat[]>(mockChats);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock loading chats
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (currentChat) {
      // Load messages for current chat
      setMessages(generateMockMessages(currentChat.id));
    }
  }, [currentChat]);

  const sendMessage = async (content: string, attachment?: File) => {
    if (!currentChat || !user) return;
    
    try {
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        chat_id: currentChat.id,
        sender_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        attachment_url: attachment ? URL.createObjectURL(attachment) : undefined,
        attachment_type: attachment ? 
          attachment.type.includes('image') ? 'image' : 
          attachment.type.includes('video') ? 'video' : 'document' : 
          undefined,
      };
      
      // Update messages locally
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Update the last message in chats
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChat.id 
            ? { ...chat, last_message: newMessage, updated_at: new Date().toISOString() } 
            : chat
        )
      );
      
      setFilteredChats(prevChats => 
        prevChats.map(chat => 
          chat.id === currentChat.id 
            ? { ...chat, last_message: newMessage, updated_at: new Date().toISOString() } 
            : chat
        )
      );
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const filterChats = (query: string) => {
    if (!query.trim()) {
      setFilteredChats(chats);
      return;
    }
    
    const filtered = chats.filter(chat => 
      chat.name?.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredChats(filtered);
  };

  return (
    <ChatsContext.Provider 
      value={{ 
        chats, 
        filteredChats,
        currentChat, 
        setCurrentChat, 
        messages, 
        users: mockUsers,
        sendMessage, 
        loading,
        filterChats
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
};
