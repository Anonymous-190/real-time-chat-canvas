
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { Chat, Message, User } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { ChatsContextProps } from './types';
import { 
  supabase, 
  fetchUsers, 
  fetchUserChats, 
  fetchChatMessages, 
  sendChatMessage 
} from './chatsService';

export const ChatsContext = createContext<ChatsContextProps | undefined>(undefined);

export const ChatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageSubscription, setMessageSubscription] = useState<any>(null);

  // Fetch users
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) return;
      
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    loadUsers();
  }, [user]);

  // Fetch chats
  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const chatsData = await fetchUserChats(user.id);
        setChats(chatsData);
        setFilteredChats(chatsData);
      } catch (error) {
        console.error('Error fetching chats:', error);
        toast.error('Failed to load chats');
      } finally {
        setLoading(false);
      }
    };
    
    loadChats();
  }, [user]);

  // Subscribe to chat changes
  useEffect(() => {
    if (!user) return;
    
    const subscription = supabase
      .channel('public:chats')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats' 
      }, async (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          // Check if this is a chat the user is part of
          const { data } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('chat_id', payload.new.id)
            .eq('user_id', user.id)
            .single();
            
          if (data) {
            // Refresh chats
            const { data: updatedChat } = await supabase
              .from('chats')
              .select('*')
              .eq('id', payload.new.id)
              .single();
              
            if (updatedChat) {
              setChats(prev => {
                const exists = prev.some(chat => chat.id === updatedChat.id);
                if (exists) {
                  return prev.map(chat => 
                    chat.id === updatedChat.id ? updatedChat : chat
                  );
                } else {
                  return [...prev, updatedChat];
                }
              });
              
              setFilteredChats(prev => {
                const exists = prev.some(chat => chat.id === updatedChat.id);
                if (exists) {
                  return prev.map(chat => 
                    chat.id === updatedChat.id ? updatedChat : chat
                  );
                } else {
                  return [...prev, updatedChat];
                }
              });
            }
          }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Fetch messages when current chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChat) return;
      
      try {
        const messagesData = await fetchChatMessages(currentChat.id);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
    };
    
    loadMessages();
    
    // Clean up previous subscription if any
    if (messageSubscription) {
      supabase.removeChannel(messageSubscription);
    }
    
    // Subscribe to message changes for current chat
    if (currentChat) {
      const subscription = supabase
        .channel(`messages:${currentChat.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${currentChat.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();
        
      setMessageSubscription(subscription);
    }
    
    return () => {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
    };
  }, [currentChat]);

  const sendMessage = async (content: string, attachment?: File) => {
    if (!currentChat || !user) return;
    
    try {
      await sendChatMessage(currentChat.id, user.id, content, attachment);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const filterChats = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredChats(chats);
      return;
    }
    
    const filtered = chats.filter(chat => 
      chat.name?.toLowerCase().includes(query.toLowerCase())
    );
    
    setFilteredChats(filtered);
  }, [chats]);

  return (
    <ChatsContext.Provider 
      value={{ 
        chats, 
        filteredChats,
        currentChat, 
        setCurrentChat, 
        messages, 
        users,
        sendMessage, 
        loading,
        filterChats
      }}
    >
      {children}
    </ChatsContext.Provider>
  );
};
