import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sword, 
  Trophy, 
  Clock, 
  Users, 
  Target, 
  Search,
  Filter,
  PlayCircle,
  CheckCircle,
  XCircle,
  Timer,
  Award,
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react';
import { challengesApi } from '@/lib/challenges-api';
import FriendsManager from '@/components/challenges/FriendsManager';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { ChallengeBattle } from '@/types/challenges';

interface BattleCardProps {
  battle: ChallengeBattle;
  currentUserId: string;
}

const BattleCard: React.FC<BattleCardProps> = ({ battle, currentUserId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isChallenger = battle.challenger_id === currentUserId;
  const opponent = isChallenger ? battle.opponent : battle.challenger;
  const myParticipant = battle.participants?.find(p => p.user_id === currentUserId);
  const opponentParticipant = battle.participants?.find(p => p.user_id !== currentUserId);

  const cancelChallengeMutation = useMutation({
    mutationFn: () => challengesApi.cancelChallenge(battle.id),
    onSuccess: () => {
      toast({ title: 'Challenge cancelled' });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to cancel challenge', 
        description: error.message 
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
        icon: Clock,
        text: 'Pending'
      },
      active: { 
        className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
        icon: PlayCircle,
        text: 'Active'
      },
      completed: { 
        className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
        icon: CheckCircle,
        text: 'Completed'
      },
      cancelled: { 
        className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
        icon: XCircle,
        text: 'Cancelled'
      },
      expired: { 
        className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
        icon: Timer,
        text: 'Expired'
      }
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.text}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'text-green-600 dark:text-green-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      hard: 'text-red-600 dark:text-red-400'
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-sm">
                <Sword className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  vs {opponent?.username}
                  {getStatusBadge(battle.status)}
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>{battle.category || 'Mixed'}</span>
                  <span className={`font-medium ${getDifficultyColor(battle.difficulty)}`}>
                    {battle.difficulty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(battle.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent Avatar */}
            <Avatar className="w-12 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold">
                {getInitials(opponent?.username || opponent?.email || 'U')}
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Battle Stats */}
          {battle.status === 'completed' && myParticipant && opponentParticipant && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {myParticipant.score || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Your Score</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {Math.round((myParticipant.accuracy || 0) * 100)}% accuracy
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {opponentParticipant.score || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Opponent Score</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {Math.round((opponentParticipant.accuracy || 0) * 100)}% accuracy
                </div>
              </div>
            </div>
          )}

          {/* Battle Info */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {battle.question_count} questions
            </span>
            <span className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              {Math.floor(battle.time_limit / 60)} mins
            </span>
            {battle.status === 'completed' && myParticipant && (
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {Math.floor((myParticipant.time_taken || 0) / 60)}:{((myParticipant.time_taken || 0) % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Winner Badge */}
          {battle.status === 'completed' && myParticipant && (
            <div className="text-center">
              {myParticipant.is_winner === true && (
                <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                  <Trophy className="w-4 h-4 mr-1" />
                  Victory!
                </Badge>
              )}
              {myParticipant.is_winner === false && (
                <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
                  Defeat
                </Badge>
              )}
              {myParticipant.is_winner === null && (
                <Badge className="bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700">
                  Draw
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {battle.status === 'pending' && battle.opponent_id === currentUserId && (
              <Button asChild className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <Link to={`/battle/${battle.id}`}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Accept Challenge
                </Link>
              </Button>
            )}
            
            {battle.status === 'pending' && battle.challenger_id === currentUserId && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => cancelChallengeMutation.mutate()}
                  disabled={cancelChallengeMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Badge variant="outline" className="px-3 py-1">
                  Waiting for response...
                </Badge>
              </>
            )}
            
            {battle.status === 'active' && (
              <Button asChild className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                <Link to={`/battle/${battle.id}`}>
                  <Sword className="w-4 h-4 mr-2" />
                  Continue Battle
                </Link>
              </Button>
            )}
            
            {battle.status === 'completed' && (
              <Button asChild variant="outline" className="flex-1">
                <Link to={`/battle/${battle.id}/results`}>
                  <Award className="w-4 h-4 mr-2" />
                  View Results
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function ChallengesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const presenceChannelRef = useRef<any>(null);
  const stopHeartbeatRef = useRef<() => void>();
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: challengesApi.getMyChallenges,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: battleStats } = useQuery({
    queryKey: ['battle-stats'],
    queryFn: challengesApi.getBattleStats,
  });

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

  const createChallengeMutation = useMutation({
    mutationFn: (email: string) => challengesApi.createChallengeIfOnline({ opponentEmail: email, difficulty: 'medium', questionCount: 10 }),
    onSuccess: () => {
      toast({ title: 'Challenge sent' });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setShowChallengeModal(false);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to create challenge', description: error.message });
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
  }, [onlineUsers, onlineUsersDb, user?.id]);

  // Filter challenges
  const filteredChallenges = challenges?.filter(challenge => {
    const opponent = challenge.challenger_id === user?.id ? challenge.opponent : challenge.challenger;
    const matchesSearch = !searchQuery || 
      opponent?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opponent?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (challenge.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || challenge.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Group challenges by status
  const pendingChallenges = filteredChallenges.filter(c => c.status === 'pending');
  const activeChallenges = filteredChallenges.filter(c => c.status === 'active');
  const completedChallenges = filteredChallenges.filter(c => c.status === 'completed');

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
          >
            Friend Challenges
          </motion.h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Challenge your friends to epic quiz battles!
          </p>
        </div>

        {/* Availability + Battle Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Players Online</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{onlineUsers.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                  <AnimatePresence>
                    {availableOpponents.slice(0, 10).map((u) => (
                      <motion.div key={u.user_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-2 py-1 rounded-md border text-sm">
                        <div className="w-6 h-6 rounded bg-emerald-500/20 grid place-items-center text-emerald-700 dark:text-emerald-300">
                          {(u.username?.slice(0,2) || 'U').toUpperCase()}
                        </div>
                        <span className="text-gray-700 dark:text-gray-200">
                          {u.username || u.email}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="ml-auto">
                  <Button onClick={() => setShowChallengeModal(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Challenge Someone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {battleStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <StatCard
                title="Total Battles"
                value={battleStats.totalBattles}
                icon={Sword}
                color="bg-gradient-to-r from-orange-500 to-red-600"
              />
              <StatCard
                title="Win Rate"
                value={`${Math.round(battleStats.winRate * 100)}%`}
                subtitle={`${battleStats.wins} wins`}
                icon={Trophy}
                color="bg-gradient-to-r from-green-500 to-emerald-600"
              />
              <StatCard
                title="Avg Score"
                value={battleStats.averageScore}
                subtitle={`${Math.round(battleStats.averageAccuracy * 100)}% accuracy`}
                icon={Target}
                color="bg-gradient-to-r from-blue-500 to-indigo-600"
              />
              <StatCard
                title="Best Time"
                value={battleStats.fastestTime > 0 ? `${Math.floor(battleStats.fastestTime / 60)}:${(battleStats.fastestTime % 60).toString().padStart(2, '0')}` : 'N/A'}
                subtitle="Fastest completion"
                icon={TrendingUp}
                color="bg-gradient-to-r from-purple-500 to-violet-600"
              />
            </motion.div>
          )}
        </div>

        {/* Challenge Someone Modal */}
        <Dialog open={showChallengeModal} onOpenChange={setShowChallengeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Select a player to challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {availableOpponents.slice(0, 10).length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">No other players online right now.</div>
              )}
              {availableOpponents.slice(0, 10).map((u) => {
                const isFriend = friendIdSet.has(u.user_id);
                return (
                  <div key={u.user_id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{u.username || u.email}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isFriend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendRequestMutation.mutate(String(u.email))}
                          disabled={sendRequestMutation.isPending}
                        >
                          Add Friend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => createChallengeMutation.mutate(String(u.email))}
                        disabled={!isFriend || createChallengeMutation.isPending}
                        className={!isFriend ? 'opacity-60 cursor-not-allowed' : ''}
                        title={!isFriend ? 'You can only challenge friends' : 'Start challenge'}
                      >
                        Challenge
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="challenges">My Challenges</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by opponent or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pending Challenges */}
            {pendingChallenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Challenges ({pendingChallenges.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {pendingChallenges.map((challenge) => (
                      <BattleCard
                        key={challenge.id}
                        battle={challenge}
                        currentUserId={user?.id || ''}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Active Challenges */}
            {activeChallenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-500" />
                  Active Battles ({activeChallenges.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {activeChallenges.map((challenge) => (
                      <BattleCard
                        key={challenge.id}
                        battle={challenge}
                        currentUserId={user?.id || ''}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  Battle History ({completedChallenges.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {completedChallenges.slice(0, 9).map((challenge) => (
                      <BattleCard
                        key={challenge.id}
                        battle={challenge}
                        currentUserId={user?.id || ''}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {completedChallenges.length > 9 && (
                  <div className="text-center mt-4">
                    <Button variant="outline">
                      View All {completedChallenges.length} Battles
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Empty State */}
            {filteredChallenges.length === 0 && !isLoading && (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Sword className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                    {searchQuery || statusFilter !== 'all' ? 'No matches found' : 'No Challenges Yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Add some friends and start challenging them to epic quiz battles!'
                    }
                  </p>
                  {(!searchQuery && statusFilter === 'all') && (
                    <Button asChild>
                      <Link to="#friends">Add Friends</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="friends">
            <FriendsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
