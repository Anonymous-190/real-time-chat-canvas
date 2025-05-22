import { createClient } from '@supabase/supabase-js';
import { Chat, Message } from '@/types/chat';
import { toast } from '@/components/ui/sonner';

// Default to empty strings for development/testing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Log warning for missing credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Some features will be unavailable.");
}

export const fetchUsers = async () => {
  if (!supabase) {
    console.warn("Supabase client is not initialized");
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const fetchUserChats = async (userId: string) => {
  if (!supabase) {
    console.warn("Supabase client is not initialized");
    return [];
  }
  
  try {
    // Get all chats where the current user is a member
    const { data: chatMembers, error: chatMembersError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);
      
    if (chatMembersError) throw chatMembersError;
    
    if (!chatMembers || chatMembers.length === 0) {
      return [];
    }
    
    const chatIds = chatMembers.map(member => member.chat_id);
    
    // Fetch chats
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });
      
    if (chatsError) throw chatsError;
    
    if (!chatsData) {
      return [];
    }
    
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
    
    return chatsWithLastMessage;
  } catch (error) {
    console.error("Error fetching chats:", error);
    return [];
  }
};

export const fetchChatMessages = async (chatId: string) => {
  if (!supabase) {
    console.warn("Supabase client is not initialized");
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
};

export const sendChatMessage = async (chatId: string, userId: string, content: string, attachment?: File) => {
  if (!supabase) {
    toast.error("Supabase client is not initialized");
    throw new Error("Supabase client is not initialized");
  }
  
  let attachmentUrl;
  let attachmentType;
  
  // Upload attachment if any
  if (attachment) {
    const fileExt = attachment.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
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
      chat_id: chatId,
      sender_id: userId,
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
    .eq('id', chatId);

  return newMessage;
};
