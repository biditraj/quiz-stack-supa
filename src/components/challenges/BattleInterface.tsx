import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Users, 
  Trophy, 
  Target, 
  Zap, 
  Sword, 
  PlayCircle, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Timer,
  UserCheck,
  Loader2
} from 'lucide-react';
import { challengesApi } from '@/lib/challenges-api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChallengeBattle, BattleAnswer } from '@/types/challenges';
import { supabase } from '@/integrations/supabase/client';

interface BattleHeaderProps {
  battle: ChallengeBattle;
  currentUserId: string;
  timeRemaining: number;
  opponentProgress: number;
  isStarted: boolean;
}

const BattleHeader: React.FC<BattleHeaderProps> = ({ 
  battle, 
  currentUserId, 
  timeRemaining, 
  opponentProgress,
  isStarted 
}) => {
  const isChallenger = battle.challenger_id === currentUserId;
  const opponent = isChallenger ? battle.opponent : battle.challenger;
  
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Sword className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                Battle vs {opponent?.username}
                <Badge 
                  variant="outline" 
                  className="bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700"
                >
                  {battle.difficulty}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {battle.category || 'Mixed Categories'} • {battle.question_count} questions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="text-center">
              <div className="flex items-center gap-2 text-lg font-bold text-orange-700 dark:text-orange-300">
                <Timer className="w-5 h-5" />
                {isStarted ? formatTime(timeRemaining) : formatTime(battle.time_limit)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isStarted ? 'Time Remaining' : 'Time Limit'}
              </p>
            </div>
            
            {/* Opponent Progress */}
            <div className="text-center">
              <div className="flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                <UserCheck className="w-5 h-5" />
                {opponentProgress}/{battle.question_count}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {opponent?.username} Progress
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

interface QuestionDisplayProps {
  question: any;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  disabled = false
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-sm">
            Question {questionIndex + 1} of {totalQuestions}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Target className="w-4 h-4" />
            Multiple Choice
          </div>
        </div>
        <CardTitle className="text-lg leading-relaxed">
          {question.question_text}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {question.image_url && (
          <div className="mb-6">
            <img 
              src={question.image_url} 
              alt="Question" 
              className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
            />
          </div>
        )}
        
        <RadioGroup
          value={selectedAnswer || ''}
          onValueChange={disabled ? undefined : onAnswerSelect}
          disabled={disabled}
        >
          <div className="space-y-3">
            {question.options.map((option: string, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex items-center space-x-3 p-4 border rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                  selectedAnswer === option 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' 
                    : 'border-gray-200 dark:border-gray-700'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem 
                  value={option} 
                  id={`option-${questionIndex}-${index}`}
                  disabled={disabled}
                />
                <Label 
                  htmlFor={`option-${questionIndex}-${index}`} 
                  className="flex-1 cursor-pointer text-gray-900 dark:text-white"
                >
                  {option}
                </Label>
                {selectedAnswer === option && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </motion.div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default function BattleInterface() {
  const { battleId } = useParams<{ battleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [battleStarted, setBattleStarted] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  // Query for battle data
  const { data: battle, isLoading, error } = useQuery({
    queryKey: ['battle', battleId],
    queryFn: () => challengesApi.getBattle(battleId!),
    enabled: !!battleId,
    refetchInterval: battleStarted ? 5000 : false, // Poll while battle is active
  });

  // Mutations
  const acceptChallengeMutation = useMutation({
    mutationFn: () => challengesApi.acceptChallenge(battleId!),
    onSuccess: () => {
      // Don't start immediately - wait for both users to be ready
      toast({ title: 'Challenge accepted!', description: 'Waiting for both players to be ready...' });
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to start battle', 
        description: error.message 
      });
    },
  });

  const startSimultaneousBattleMutation = useMutation({
    mutationFn: () => challengesApi.startBattle(battleId!),
    onSuccess: () => {
      setBattleStarted(true);
      startTimeRef.current = Date.now();
      setTimeRemaining(battle?.time_limit || 600);
      toast({ title: 'Battle started!', description: 'Both players ready - Good luck!' });
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to start battle', 
        description: error.message 
      });
    },
  });

  const joinBattleMutation = useMutation({
    mutationFn: () => challengesApi.joinBattle(battleId!),
    onSuccess: () => {
      setBattleStarted(true);
      startTimeRef.current = Date.now();
      setTimeRemaining(battle?.time_limit || 600);
      toast({ title: 'Joined battle!', description: 'Good luck!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to join battle', 
        description: error.message 
      });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: (answerData: any) => challengesApi.submitAnswer(battleId!, answerData),
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to submit answer', 
        description: error.message 
      });
    },
  });

  const completeBattleMutation = useMutation({
    mutationFn: (results: any) => challengesApi.completeBattle(battleId!, results),
    onSuccess: () => {
      navigate(`/battle/${battleId}/results`);
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to complete battle', 
        description: error.message 
      });
      setIsCompleting(false);
    },
  });

  // Timer effect
  useEffect(() => {
    if (battleStarted && timeRemaining > 0 && !isCompleting) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && battleStarted && !isCompleting) {
      handleCompleteBattle();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, battleStarted, isCompleting]);

  // Initialize battle state based on status
  useEffect(() => {
    if (battle) {
      if (battle.status === 'active') {
        setBattleStarted(true);
        if (battle.started_at) {
          const elapsed = Math.floor((Date.now() - new Date(battle.started_at).getTime()) / 1000);
          const remaining = Math.max(0, battle.time_limit - elapsed);
          setTimeRemaining(remaining);
          startTimeRef.current = new Date(battle.started_at).getTime();
        } else {
          setTimeRemaining(battle.time_limit);
          startTimeRef.current = Date.now();
        }
      } else {
        setTimeRemaining(battle.time_limit);
      }
    }
  }, [battle]);

  // Consolidated real-time subscriptions for synchronized battle updates
  useEffect(() => {
    if (!battleId || !user?.id) return;

    console.log('Setting up real-time subscriptions for battle:', battleId);

    const channel = supabase
      .channel(`battle-events-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_events',
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          const event = payload.new;
          console.log('Received battle event:', event);
          
          if (event.event_type === 'started') {
            // Battle started synchronously for both players
            if (!battleStarted) {
              console.log('Battle started event received, starting battle...');
              setBattleStarted(true);
              startTimeRef.current = Date.now();
              setTimeRemaining(battle?.time_limit || 600);
              toast({ 
                title: '🚀 Battle Started!', 
                description: 'Both players are now competing! Good luck!' 
              });
              queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
            }
          } else if (event.event_type === 'answered' && event.user_id !== user?.id) {
            // Opponent answered a question
            setOpponentProgress(prev => prev + 1);
            const questionNum = (event.data?.question_index || 0) + 1;
            toast({
              title: '⚡ Opponent Progress',
              description: `Your opponent answered question ${questionNum}!`,
              duration: 2000
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenge_battles',
          filter: `id=eq.${battleId}`,
        },
        (payload) => {
          const updatedBattle = payload.new;
          console.log('Battle updated:', updatedBattle);
          
          if (updatedBattle.status === 'active' && !battleStarted) {
            console.log('Battle status changed to active, starting battle...');
            setBattleStarted(true);
            if (updatedBattle.started_at) {
              const elapsed = Math.floor((Date.now() - new Date(updatedBattle.started_at).getTime()) / 1000);
              const remaining = Math.max(0, updatedBattle.time_limit - elapsed);
              setTimeRemaining(remaining);
              startTimeRef.current = new Date(updatedBattle.started_at).getTime();
            } else {
              setTimeRemaining(updatedBattle.time_limit);
              startTimeRef.current = Date.now();
            }
            toast({ 
              title: '🚀 Battle Started!', 
              description: 'Both players are now competing! Good luck!' 
            });
            queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [battleId, user?.id, battleStarted, battle?.time_limit, queryClient, toast]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    
    // Submit answer immediately
    const question = battle?.questions[questionIndex];
    const answerData: BattleAnswer = {
      questionIndex,
      questionId: question?.id || '',
      selectedAnswer: answer,
      isCorrect: answer === question?.correct_answer,
      timeSpent: Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000),
      timestamp: Date.now(),
    };
    
    submitAnswerMutation.mutate(answerData);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (battle?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleCompleteBattle();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleCompleteBattle = () => {
    if (isCompleting) return;
    setIsCompleting(true);
    
    const totalQuestions = battle?.questions.length || 0;
    const correctAnswers = Object.entries(selectedAnswers).filter(([index, answer]) => {
      const question = battle?.questions[parseInt(index)];
      return answer === question?.correct_answer;
    }).length;

    const results = {
      score: correctAnswers * 10, // 10 points per correct answer
      accuracy: totalQuestions > 0 ? correctAnswers / totalQuestions : 0,
      timeTaken: (battle?.time_limit || 600) - timeRemaining,
      questionCount: totalQuestions,
    };

    completeBattleMutation.mutate(results);
  };

  const canAcceptChallenge = () => {
    if (!battle || !user) return false;
    return battle.status === 'pending' && battle.opponent_id === user.id;
  };

  const canJoinBattle = () => {
    if (!battle || !user) return false;
    return battle.status === 'active' && 
           (battle.challenger_id === user.id || battle.opponent_id === user.id) &&
           !battleStarted;
  };

  const canStartBattle = () => {
    if (!battle || !user) return false;
    return battle.status === 'accepted' && !battleStarted;
  };

  const isWaitingForAcceptance = () => {
    if (!battle || !user) return false;
    return battle.status === 'accepted' && 
           battle.challenger_id === user.id; // Challenger waits for opponent
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600 dark:text-gray-300">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <h3 className="text-xl font-semibold mb-2">Battle Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The battle you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/challenges')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = battle.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / battle.questions.length) * 100;
  const answeredQuestions = Object.keys(selectedAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Battle Header */}
        <BattleHeader
          battle={battle}
          currentUserId={user?.id || ''}
          timeRemaining={timeRemaining}
          opponentProgress={opponentProgress}
          isStarted={battleStarted}
        />

        {/* Battle Status */}
        {!battleStarted ? (
          <Card className="mb-6">
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>
              
              {canAcceptChallenge() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    Challenge Received!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    {battle.challenger?.username} has challenged you to a quiz battle! 
                    Are you ready to test your knowledge?
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {battle.question_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-4 h-4" />
                      {Math.floor(battle.time_limit / 60)} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {battle.difficulty} difficulty
                    </span>
                  </div>
                  <Button
                    onClick={() => acceptChallengeMutation.mutate()}
                    disabled={acceptChallengeMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
                  >
                    {acceptChallengeMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Starting Battle...
                      </>
                    ) : (
                      <>
                        <Sword className="w-5 h-5 mr-2" />
                        Accept Challenge!
                      </>
                    )}
                  </Button>
                </>
              ) : canStartBattle() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
                    🚀 Ready to Start!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Challenge accepted! Both players are ready.
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      ⚡ <strong>Synchronized Start:</strong> When you click "Start Battle", both players will begin at exactly the same time with identical questions!
                    </p>
                  </div>
                  <Button
                    onClick={() => startSimultaneousBattleMutation.mutate()}
                    disabled={startSimultaneousBattleMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                  >
                    {startSimultaneousBattleMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Starting Battle...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Start Battle Now!
                      </>
                    )}
                  </Button>
                </>
              ) : isWaitingForAcceptance() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                    ⏳ Challenge Accepted!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    The opponent accepted your challenge! Either player can start when ready.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      💡 Click "Start Battle" to begin the synchronized challenge for both players.
                    </p>
                  </div>
                  <Button
                    onClick={() => startSimultaneousBattleMutation.mutate()}
                    disabled={startSimultaneousBattleMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {startSimultaneousBattleMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Starting Battle...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Start Battle Now!
                      </>
                    )}
                  </Button>
                </>
              ) : canJoinBattle() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    Battle is Active!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    The battle has started. Join now to begin answering questions!
                  </p>
                  <Button
                    onClick={() => joinBattleMutation.mutate()}
                    disabled={joinBattleMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {joinBattleMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Join Battle!
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Waiting for Battle to Start
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    The battle will begin once your opponent accepts the challenge.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Waiting...
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Question {currentQuestionIndex + 1} of {battle.questions.length}</span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {answeredQuestions} answered
                </span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question Display */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <QuestionDisplay
                  question={currentQuestion}
                  questionIndex={currentQuestionIndex}
                  totalQuestions={battle.questions.length}
                  selectedAnswer={selectedAnswers[currentQuestionIndex]}
                  onAnswerSelect={(answer) => handleAnswerSelect(currentQuestionIndex, answer)}
                  disabled={isCompleting}
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0 || isCompleting}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {timeRemaining > 0 ? (
                        <>Time remaining: <span className="font-bold text-orange-600">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span></>
                      ) : (
                        <span className="text-red-600 font-bold">Time's up!</span>
                      )}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleNextQuestion}
                    disabled={!selectedAnswers[currentQuestionIndex] || isCompleting}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Completing...
                      </>
                    ) : currentQuestionIndex === battle.questions.length - 1 ? (
                      <>
                        Finish Battle
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Next Question
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
