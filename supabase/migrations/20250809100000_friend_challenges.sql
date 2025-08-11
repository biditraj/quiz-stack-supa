-- Friend Management System Migration
-- Enable required extensions
create extension if not exists pgcrypto;

-- 1) Friend relationships table
CREATE TABLE IF NOT EXISTS public.friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- 2) Online users table for presence tracking
CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_relationships
CREATE POLICY "Users can view their friend relationships" ON public.friend_relationships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" ON public.friend_relationships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend relationships" ON public.friend_relationships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete friend relationships" ON public.friend_relationships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- RLS Policies for online_users
CREATE POLICY "Users can view online users" ON public.online_users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own online status" ON public.online_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own online status" ON public.online_users
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to send a friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(receiver_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receiver_id UUID;
  existing_request_id UUID;
  result_message TEXT;
BEGIN
  -- Find the receiver by email
  SELECT id INTO receiver_id 
  FROM public.profiles 
  WHERE email = receiver_email;
  
  IF receiver_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', receiver_email;
  END IF;
  
  -- Check if sender is trying to add themselves
  IF receiver_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot send a friend request to yourself';
  END IF;
  
  -- Check if there's already a request between these users
  SELECT id INTO existing_request_id
  FROM public.friend_relationships
  WHERE (requester_id = auth.uid() AND receiver_id = receiver_id)
     OR (requester_id = receiver_id AND receiver_id = auth.uid());
  
  IF existing_request_id IS NOT NULL THEN
    RAISE EXCEPTION 'A friend request already exists between you and this user';
  END IF;
  
  -- Create the friend request
  INSERT INTO public.friend_relationships (requester_id, receiver_id, status)
  VALUES (auth.uid(), receiver_id, 'pending');
  
  result_message := 'Friend request sent to ' || receiver_email;
  RETURN result_message;
END;
$$;

-- Function to respond to a friend request
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(request_id UUID, response TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request details
  SELECT * INTO request_record
  FROM public.friend_relationships
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF request_record IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or you are not authorized to respond';
  END IF;
  
  -- Update the request status
  UPDATE public.friend_relationships
  SET status = response, updated_at = NOW()
  WHERE id = request_id;
  
  RETURN TRUE;
END;
$$;

-- Function to get user's friends
CREATE OR REPLACE FUNCTION public.get_user_friends()
RETURNS TABLE (
  id UUID,
  requester_id UUID,
  receiver_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  friend_id UUID,
  friend_username TEXT,
  friend_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id,
    fr.requester_id,
    fr.receiver_id,
    fr.status,
    fr.created_at,
    fr.updated_at,
    CASE 
      WHEN fr.requester_id = auth.uid() THEN fr.receiver_id
      ELSE fr.requester_id
    END as friend_id,
    CASE 
      WHEN fr.requester_id = auth.uid() THEN p_receiver.username
      ELSE p_requester.username
    END as friend_username,
    CASE 
      WHEN fr.requester_id = auth.uid() THEN p_receiver.email
      ELSE p_requester.email
    END as friend_email
  FROM public.friend_relationships fr
  LEFT JOIN public.profiles p_requester ON fr.requester_id = p_requester.id
  LEFT JOIN public.profiles p_receiver ON fr.receiver_id = p_receiver.id
  WHERE (fr.requester_id = auth.uid() OR fr.receiver_id = auth.uid())
    AND fr.status = 'accepted';
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_relationships_requester_id ON public.friend_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_receiver_id ON public.friend_relationships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_status ON public.friend_relationships(status);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON public.online_users(last_seen);

-- Add comments for documentation
COMMENT ON TABLE public.friend_relationships IS 'Stores friend relationships between users';
COMMENT ON TABLE public.online_users IS 'Tracks user online presence for friend management';
COMMENT ON FUNCTION public.send_friend_request IS 'Sends a friend request to another user by email';
COMMENT ON FUNCTION public.respond_to_friend_request IS 'Responds to a friend request (accept/decline)';
COMMENT ON FUNCTION public.get_user_friends IS 'Gets the current user''s accepted friends list';
