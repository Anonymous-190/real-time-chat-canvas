import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Chat, Message, User } from '@/types/chat';
import { toast } from '@/components/ui/sonner';
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key are required. Please check your environment variables.");
  toast.error("Missing Supabase configuration. Please check the console for details.");
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const fetchUsers = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');
          
        if (error) throw error;
        
        if (data) {
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [user]);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get all chats where the current user is a member
        const { data: chatMembers, error: chatMembersError } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id);
          
        if (chatMembersError) throw chatMembersError;
        
        if (chatMembers && chatMembers.length > 0) {
          const chatIds = chatMembers.map(member => member.chat_id);
          
          // Fetch chats
          const { data: chatsData, error: chatsError } = await supabase
            .from('chats')
            .select('*')
            .in('id', chatIds)
            .order('updated_at', { ascending: false });
            
          if (chatsError) throw chatsError;
          
          if (chatsData) {
            // Fetch last message for each chat
            const chatsWithLastMessage = await Promise.all(
              chatsData.map(async (chat) => {
                const { data: lastMessageData } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('chat_id', chat.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                  
                return {
                  ...chat,
                  last_message: lastMessageData || undefined
                };
              })
            );
            
            setChats(chatsWithLastMessage);
            setFilteredChats(chatsWithLastMessage);
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        toast.error('Failed to load chats');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
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
    const fetchMessages = async () => {
      if (!currentChat) return;
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', currentChat.id)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        
        if (data) {
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
    };
    
    fetchMessages();
    
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
      let attachmentUrl;
      let attachmentType;
      
      // Upload attachment if any
      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('attachments')
          .upload(filePath, attachment);
          
        if (uploadError) throw uploadError;
        
        if (uploadData) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('attachments')
            .getPublicUrl(filePath);
            
          attachmentUrl = publicUrl;
          
          if (attachment.type.includes('image')) {
            attachmentType = 'image';
          } else if (attachment.type.includes('video')) {
            attachmentType = 'video';
          } else {
            attachmentType = 'document';
          }
        }
      }
      
      // Insert message
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          chat_id: currentChat.id,
          sender_id: user.id,
          content,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update chat's last_message and updated_at
      await supabase
        .from('chats')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', currentChat.id);
      
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

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
};
