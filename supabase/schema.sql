
-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'offline'
);

-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_group BOOLEAN DEFAULT FALSE,
  type TEXT, -- 'demo', 'internal', 'signup', 'content', etc.
  labels TEXT[] DEFAULT '{}'::TEXT[]
);

-- Create chat_members table (for managing chat participants)
CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'member',
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  attachment_type TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Create Row Level Security policies
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data and data of users in the same chat"
  ON users FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM chat_members cm1
      JOIN chat_members cm2 ON cm1.chat_id = cm2.chat_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = id
    )
  );

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Chats table policies
CREATE POLICY "Users can view chats they're a member of"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update chats they're a member of"
  ON chats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

-- Chat members table policies
CREATE POLICY "Users can view chat members for chats they're in"
  ON chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to chats they're in"
  ON chat_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = chat_id AND user_id = auth.uid()
    )
  );

-- Messages table policies
CREATE POLICY "Users can view messages in chats they're a member of"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in chats they're a member of"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_id = chat_id AND user_id = auth.uid()
    )
  );

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

-- Set up storage policies for attachments
CREATE POLICY "Anyone can view attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for chats table
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at();
