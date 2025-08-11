import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Mail
} from 'lucide-react';
import { challengesApi } from '@/lib/challenges-api';
import FriendsManager from '@/components/challenges/FriendsManager';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function ChallengesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const presenceChannelRef = useRef<any>(null);
  const stopHeartbeatRef = useRef<() => void>();
  const [showFriendModal, setShowFriendModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: challengesApi.getFriends,
  });

  const friendIdSet = useMemo(() => {
    const set = new Set<string>();
    (friends || []).forEach((fr: any) => {
      const otherId = fr.requester_id === user?.id ? fr.receiver?.id : fr.requester?.id;
      if (otherId) set.add(otherId);
    });
    return set;
  }, [friends, user?.id]);

  const sendRequestMutation = useMutation({
    mutationFn: (email: string) => challengesApi.sendFriendRequest(email),
    onSuccess: () => {
      toast({ title: 'Friend request sent' });
      queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to send request', description: error.message });
    },
  });

  // Availability (presence)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!user) return;
      // start DB heartbeat for server-side online check
      stopHeartbeatRef.current = await challengesApi.startOnlineHeartbeat();
      const channel = await challengesApi.connectAvailability((state) => {
        if (!isMounted) return;
        const flat = Object.values(state as Record<string, any[]>).flat();
        setOnlineUsers(flat);
      });
      presenceChannelRef.current = channel;
    })();
    return () => {
      isMounted = false;
      if (presenceChannelRef.current) challengesApi.disconnectAvailability(presenceChannelRef.current);
      if (stopHeartbeatRef.current) stopHeartbeatRef.current();
    };
  }, [user?.id]);

  // Combine presence with heartbeat fallback to ensure the modal doesn't show empty when presence sync lags
  const { data: onlineUsersDb } = useQuery({
    queryKey: ['online-users-db'],
    queryFn: challengesApi.getOnlineUsers,
    refetchInterval: 30000,
  });

  const availableOpponents = useMemo(() => {
    const byId = new Map<string, any>();
    for (const u of onlineUsersDb || []) {
      if (u.user_id !== user?.id) byId.set(u.user_id, { user_id: u.user_id, username: u.username, email: u.email });
    }
    for (const p of onlineUsers || []) {
      if (p.user_id !== user?.id) byId.set(p.user_id, { user_id: p.user_id, username: p.username, email: p.email });
    }
    return Array.from(byId.values());
  }, [onlineUsersDb, onlineUsers, user?.id]);

  const filteredOpponents = useMemo(() => {
    if (!searchQuery) return availableOpponents;
    const query = searchQuery.toLowerCase();
    return availableOpponents.filter(u => 
      u.username?.toLowerCase().includes(query) || 
      u.email?.toLowerCase().includes(query)
    );
  }, [availableOpponents, searchQuery]);

  const handleSendRequest = (email: string) => {
    sendRequestMutation.mutate(email);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Friends & Connections
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect with friends and see who's online!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Online Users */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Online Users
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredOpponents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No users currently online</p>
                    </div>
                  ) : (
                    filteredOpponents.map((user) => (
                      <motion.div
                        key={user.user_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                              {getInitials(user.username || user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.username || 'Anonymous'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-600 dark:text-green-400">Online</span>
                          {!friendIdSet.has(user.user_id) && (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(user.email)}
                              disabled={sendRequestMutation.isPending}
                              className="ml-2"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add Friend
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="mt-4 text-center">
                  <Button
                    onClick={() => setShowFriendModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend by Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Friends Manager */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FriendsManager />
          </motion.div>
        </div>

        {/* Add Friend Modal */}
        <Dialog open={showFriendModal} onOpenChange={setShowFriendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Friend's Email
                </label>
                <Input
                  type="email"
                  placeholder="friend@example.com"
                  id="friendEmail"
                  className="w-full"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFriendModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const email = (document.getElementById('friendEmail') as HTMLInputElement).value;
                    if (email) {
                      handleSendRequest(email);
                      setShowFriendModal(false);
                    }
                  }}
                  disabled={sendRequestMutation.isPending}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
