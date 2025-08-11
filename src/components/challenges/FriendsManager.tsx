import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  Loader2,
  Mail
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { challengesApi } from '@/lib/challenges-api';
import { FriendRelationship } from '@/types/challenges';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface FriendCardProps {
  friendship: FriendRelationship;
  currentUserId: string;
  onRemove?: (friendshipId: string) => void;
  isOnline?: boolean;
}

const FriendCard: React.FC<FriendCardProps> = ({ friendship, currentUserId, onRemove, isOnline = false }) => {
  const isRequester = friendship.requester_id === currentUserId;
  const friend = isRequester ? friendship.receiver : friendship.requester;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              {getInitials(friend?.username || friend?.email || 'U')}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {friend?.username || friend?.email?.split('@')[0] || 'Unknown User'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {friend?.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {friendship.status}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {onRemove && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(friendship.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <UserX className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface PendingRequestCardProps {
  request: FriendRelationship;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  type: 'received' | 'sent';
}

const PendingRequestCard: React.FC<PendingRequestCardProps> = ({ 
  request, 
  onAccept, 
  onDecline, 
  onCancel,
  type 
}) => {
  const user = type === 'received' ? request.requester : request.receiver;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400">
            {getInitials(user?.username || user?.email || 'U')}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {user?.username || user?.email?.split('@')[0] || 'Unknown User'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.email}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {type === 'received' ? (
          <>
            <Button
              size="sm"
              onClick={() => onAccept(request.id)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <UserCheck className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline(request.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <UserX className="w-4 h-4" />
            </Button>
          </>
        ) : (
          onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(request.id)}
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
          )
        )}
      </div>
    </motion.div>
  );
};

export default function FriendsManager() {
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: challengesApi.sendFriendRequest,
    onSuccess: () => {
      toast({
        title: 'Friend request sent!',
        description: 'The user will be notified of your request.',
      });
      setNewFriendEmail('');
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => challengesApi.respondToFriendRequest(requestId, 'accepted'),
    onSuccess: () => {
      toast({
        title: 'Friend request accepted!',
        description: 'You are now friends!',
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to accept request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (requestId: string) => challengesApi.respondToFriendRequest(requestId, 'declined'),
    onSuccess: () => {
      toast({
        title: 'Friend request declined',
        description: 'The request has been declined.',
      });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to decline request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelSentRequestMutation = useMutation({
    mutationFn: challengesApi.cancelSentRequest,
    onSuccess: () => {
      toast({
        title: 'Request cancelled',
        description: 'Your friend request has been cancelled.',
      });
      queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to cancel request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: challengesApi.removeFriend,
    onSuccess: () => {
      toast({
        title: 'Friend removed',
        description: 'The friendship has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove friend',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleSendRequest = () => {
    if (newFriendEmail.trim()) {
      sendRequestMutation.mutate(newFriendEmail.trim());
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleDeclineRequest = (requestId: string) => {
    declineRequestMutation.mutate(requestId);
  };

  const handleCancelSentRequest = (requestId: string) => {
    cancelSentRequestMutation.mutate(requestId);
  };

  const handleRemoveFriend = (friendshipId: string) => {
    removeFriendMutation.mutate(friendshipId);
  };

  // Filtered friends based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return []; // This will be populated by the parent component
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Add Friend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Add New Friend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter friend's email address"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendRequest()}
                />
              </div>
            </div>
            <Button 
              onClick={handleSendRequest}
              disabled={!newFriendEmail.trim() || sendRequestMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendRequestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Send Request'
              )}
            </Button>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
            Send a friend request to connect with other users!
          </p>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your friend requests here. You can accept, decline, or cancel pending requests.
          </p>
        </CardContent>
      </Card>

      {/* Friends List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              My Friends
            </CardTitle>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your friends will appear here once you've connected with them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
