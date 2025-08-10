import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Sword, 
  Search,
  Mail,
  Clock,
  UserMinus,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { challengesApi } from '@/lib/challenges-api';
import { useToast } from '@/components/ui/use-toast';
import type { FriendRelationship } from '@/types/challenges';
import { useAuth } from '@/contexts/AuthContext';

interface FriendCardProps {
  friendship: FriendRelationship;
  currentUserId: string;
  onChallenge: (friendEmail: string) => void;
  onRemove?: (friendshipId: string) => void;
  isOnline?: boolean;
}

const FriendCard: React.FC<FriendCardProps> = ({ friendship, currentUserId, onChallenge, onRemove, isOnline = false }) => {
  const friend = friendship.requester_id === currentUserId 
    ? friendship.receiver 
    : friendship.requester;

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 rounded-lg relative">
                <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold">
                  {getInitials(friend?.username || friend?.email || 'U')}
                </AvatarFallback>
                <span className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {friend?.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {friend?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onChallenge(friend?.email || '')}
                disabled={!isOnline}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-sm"
              >
                <Sword className="w-4 h-4 mr-1" />
                {isOnline ? 'Challenge' : 'Offline'}
              </Button>
              
              {onRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(friendship.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 rounded-lg">
                <AvatarFallback className="rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold">
                  {getInitials(user?.username || user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user?.username}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Clock className="w-3 h-3" />
                  {type === 'received' ? 'Wants to be friends' : 'Request sent'}
                </div>
              </div>
            </div>
            
            {type === 'received' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onAccept(request.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDecline(request.id)}
                  className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {type === 'sent' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-yellow-700 border-yellow-300 dark:text-yellow-400 dark:border-yellow-600">
                  Pending
                </Badge>
                {onCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(request.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function FriendsManager() {
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const presenceChannelRef = useRef<any>(null);
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Queries
  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: challengesApi.getFriends,
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: challengesApi.getPendingRequests,
  });

  const { data: sentRequests, isLoading: loadingSent } = useQuery({
    queryKey: ['sent-requests'],
    queryFn: challengesApi.getSentRequests,
  });

  // Mutations
  const sendRequestMutation = useMutation({
    mutationFn: challengesApi.sendFriendRequest,
    onSuccess: () => {
      toast({ 
        title: 'Friend request sent!', 
        description: 'Your friend request has been sent successfully.' 
      });
      setNewFriendEmail('');
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to send request', 
        description: error.message 
      });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: ({ requestId, response }: { requestId: string; response: 'accepted' | 'declined' }) =>
      challengesApi.respondToFriendRequest(requestId, response),
    onSuccess: (_, { response }) => {
      toast({ 
        title: response === 'accepted' ? 'Friend request accepted!' : 'Friend request declined',
        description: response === 'accepted' 
          ? 'You are now friends and can challenge each other!'
          : 'The friend request has been declined.'
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to respond to request', 
        description: error.message 
      });
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: ({ opponentEmail, difficulty }: { opponentEmail: string; difficulty: 'easy' | 'medium' | 'hard' }) =>
      challengesApi.createChallengeIfOnline({
        opponentEmail,
        difficulty,
        questionCount: 10
      }),
    onSuccess: () => {
      toast({ 
        title: 'Challenge sent!', 
        description: 'Your challenge has been sent to your friend.' 
      });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to send challenge', 
        description: error.message 
      });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: challengesApi.removeFriend,
    onSuccess: () => {
      toast({ 
        title: 'Friend removed', 
        description: 'The friend has been removed from your list.' 
      });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to remove friend', 
        description: error.message 
      });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => challengesApi.cancelSentRequest(requestId),
    onSuccess: () => {
      toast({
        title: 'Request cancelled',
        description: 'Your friend request has been cancelled.'
      });
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel request',
        description: error.message,
      });
    },
  });

  // Handlers
  const handleSendRequest = () => {
    if (!newFriendEmail.trim()) return;
    sendRequestMutation.mutate(newFriendEmail.trim());
  };

  const handleAcceptRequest = (requestId: string) => {
    respondToRequestMutation.mutate({ requestId, response: 'accepted' });
  };

  const handleDeclineRequest = (requestId: string) => {
    respondToRequestMutation.mutate({ requestId, response: 'declined' });
  };

  const handleCancelSentRequest = (requestId: string) => {
    cancelRequestMutation.mutate(requestId);
  };

  const handleChallengeFriend = (friendEmail: string) => {
    createChallengeMutation.mutate({ opponentEmail: friendEmail, difficulty: 'medium' });
  };

  const handleRemoveFriend = (friendshipId: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      removeFriendMutation.mutate(friendshipId);
    }
  };

  // Filter friends based on search
  const filteredFriends = friends?.filter(friendship => {
    if (!searchQuery) return true;
    const friend = friendship.requester_id === (user?.id || '')
      ? friendship.receiver
      : friendship.requester;
    return friend?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
           friend?.email.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Presence subscription to track online friends
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const channel = await challengesApi.connectAvailability((state) => {
        if (!isMounted) return;
        const flat = Object.values(state as Record<string, any[]>).flat();
        const emails = new Set<string>(flat.map((p: any) => String(p.email || '').toLowerCase()));
        setOnlineEmails(emails);
      });
      presenceChannelRef.current = channel;
    })();
    return () => {
      isMounted = false;
      if (presenceChannelRef.current) challengesApi.disconnectAvailability(presenceChannelRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Add Friend Section */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <UserPlus className="w-5 h-5" />
            Add New Friend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
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
            Send a friend request to start challenging each other to quiz battles!
          </p>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {(pendingRequests && pendingRequests.length > 0) || (sentRequests && sentRequests.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Received Requests */}
            {pendingRequests && pendingRequests.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Received ({pendingRequests.length})
                </h4>
                <div className="space-y-2">
                  <AnimatePresence>
                    {pendingRequests.map((request) => (
                      <PendingRequestCard
                        key={request.id}
                        request={request}
                        type="received"
                        onAccept={handleAcceptRequest}
                        onDecline={handleDeclineRequest}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Sent Requests */}
            {sentRequests && sentRequests.length > 0 && (
              <>
                {pendingRequests && pendingRequests.length > 0 && <Separator />}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Sent ({sentRequests.length})
                  </h4>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {sentRequests.map((request) => (
                        <PendingRequestCard
                          key={request.id}
                          request={request}
                          type="sent"
                          onAccept={handleAcceptRequest}
                          onDecline={handleDeclineRequest}
                          onCancel={handleCancelSentRequest}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              My Friends ({filteredFriends.length})
            </CardTitle>
            
            {friends && friends.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingFriends ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredFriends.map((friendship) => (
                  <FriendCard
                    key={friendship.id}
                    friendship={friendship}
                    currentUserId={user?.id || ''}
                    isOnline={Boolean(((friendship.requester_id === (user?.id || '')) ? friendship.receiver?.email : friendship.requester?.email) && onlineEmails.has(String((friendship.requester_id === (user?.id || '')) ? friendship.receiver?.email : friendship.requester?.email).toLowerCase()))}
                    onChallenge={handleChallengeFriend}
                    onRemove={handleRemoveFriend}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No friends yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery 
                  ? `No friends found matching "${searchQuery}"`
                  : 'Add some friends to start challenging them to epic quiz battles!'
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
