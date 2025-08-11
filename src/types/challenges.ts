// Types for Friend Management system

export interface Profile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface FriendRelationship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: Profile;
  receiver?: Profile;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface FriendsApiResponse extends ApiResponse<FriendRelationship[]> {}

export interface FriendCardProps {
  friendship: FriendRelationship;
  onRemove?: (friendshipId: string) => void;
}

export interface SendFriendRequestForm {
  email: string;
}

export interface ChallengeNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_declined';
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export interface WebSocketMessage {
  type: 'friend_update' | 'notification';
  payload: any;
}
