
export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  phone_number?: string;
  created_at: string;
  last_seen?: string;
  status?: 'online' | 'offline';
}

export interface Chat {
  id: string;
  name?: string;
  created_at: string;
  updated_at: string;
  is_group: boolean;
  last_message?: Message;
  unread_count?: number;
  type?: 'demo' | 'internal' | 'signup' | 'content';
  labels?: string[];
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  joined_at: string;
  role?: 'admin' | 'member';
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'video' | 'document';
}
