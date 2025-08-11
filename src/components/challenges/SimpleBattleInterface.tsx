import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Trophy, 
  Target, 
  Sword, 
  PlayCircle, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Timer,
  Loader2
} from 'lucide-react';
import { simpleBattleApi } from '@/lib/simple-battle-api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface SimpleBattleHeaderProps {
  battle: any;
  currentUserId: string;
  timeRemaining: number;
  myScore: number;
  opponentScore: number;
  isStarted: boolean;
}

const SimpleBattleHeader: React.FC<SimpleBattleHeaderProps> = ({ 
  battle, 
  currentUserId, 
  timeRemaining, 
  myScore,
  opponentScore,
  isStarted 
}) => {
  const isChallenger = battle.challenger_id === currentUserId;
  const opponent = isChallenger ? battle.opponent : battle.challenger;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sword className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                Battle vs {opponent?.username || 'Opponent'}
                <Badge variant="outline" className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700">
                  {battle.difficulty || 'Medium'}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {battle.category || 'Mixed Categories'} • {battle.question_count || 10} questions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="text-center">
              <div className="flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                <Timer className="w-5 h-5" />
                {isStarted ? formatTime(timeRemaining) : formatTime(battle.time_limit || 600)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isStarted ? 'Time Remaining' : 'Time Limit'}
              </p>
            </div>
            
            {/* Scores */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {myScore}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your Score</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {opponentScore}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Opponent</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

interface SimpleQuestionDisplayProps {
  question: any;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

const SimpleQuestionDisplay: React.FC<SimpleQuestionDisplayProps> = ({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  disabled = false
}) => {
  if (!question) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-sm">
            Question {questionIndex + 1} of {totalQuestions}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Target className="w-4 h-4" />
            {question.type || 'multiple_choice'}
          </div>
        </div>
        <CardTitle className="text-lg leading-relaxed">
          {question.question_text || question.text || 'Question text not available'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedAnswer}
          onValueChange={onAnswerSelect}
          disabled={disabled}
          className="space-y-3"
        >
          {(question.options || question.choices || []).map((option: string, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label 
                htmlFor={`option-${index}`} 
                className="text-base cursor-pointer hover:text-blue-600 transition-colors"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default function SimpleBattleInterface() {
  const { battleId } = useParams<{ battleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(600); // Default 10 minutes
  const [battleStarted, setBattleStarted] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Query for battle data
  const { data: battle, isLoading, error } = useQuery({
    queryKey: ['battle', battleId],
    queryFn: () => simpleBattleApi.getBattle(battleId!),
    enabled: !!battleId,
    refetchInterval: battleStarted ? 2000 : false, // Poll every 2 seconds while active
  });

  // Mutations
  const acceptChallengeMutation = useMutation({
    mutationFn: () => simpleBattleApi.acceptChallenge(battleId!),
    onSuccess: () => {
      toast({ title: 'Challenge accepted!', description: 'Battle is starting...' });
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to accept challenge', 
        description: error.message 
      });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: (answerData: any) => simpleBattleApi.submitAnswer(battleId!, answerData),
    onSuccess: (data: any) => {
      // Update local score immediately
      if (data.score !== undefined) {
        setMyScore(data.score);
      }
      toast({ 
        title: 'Answer submitted!', 
        description: `Score: ${data.score || myScore}`,
        duration: 1500
      });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to submit answer', 
        description: error.message 
      });
    },
  });

  const completeBattleMutation = useMutation({
    mutationFn: (results: any) => simpleBattleApi.completeBattle(battleId!, results),
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
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && battleStarted && !isCompleting) {
      handleCompleteBattle();
    }
  }, [timeRemaining, battleStarted, isCompleting]);

  // Initialize battle state
  useEffect(() => {
    if (battle) {
      if (battle.status === 'active') {
        setBattleStarted(true);
        if (battle.started_at) {
          const elapsed = Math.floor((Date.now() - new Date(battle.started_at).getTime()) / 1000);
          const remaining = Math.max(0, (battle.time_limit || 600) - elapsed);
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(battle.time_limit || 600);
        }
      } else {
        setTimeRemaining(battle.time_limit || 600);
      }
    }
  }, [battle]);

  // Real-time updates
  useEffect(() => {
    if (!battleId || !user?.id) return;

    const channel = supabase
      .channel(`simple-battle-${battleId}`)
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
          if (updatedBattle.status === 'active' && !battleStarted) {
            setBattleStarted(true);
            setTimeRemaining(updatedBattle.time_limit || 600);
            toast({ 
              title: '🚀 Battle Started!', 
              description: 'Good luck!' 
            });
          }
        }
      )
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
          if (event.event_type === 'answered' && event.user_id !== user?.id) {
            // Opponent answered - update their score
            if (event.data?.score !== undefined) {
              setOpponentScore(event.data.score);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, user?.id, battleStarted, toast]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    
    // Submit answer immediately
    const question = battle?.questions?.[questionIndex];
    if (!question) return;

    const answerData = {
      questionIndex,
      questionId: question.id || questionIndex.toString(),
      selectedAnswer: answer,
      isCorrect: answer === (question.correct_answer || question.answer),
      timeSpent: Math.floor((battle?.time_limit || 600) - timeRemaining),
      timestamp: Date.now(),
    };
    
    submitAnswerMutation.mutate(answerData);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (battle?.questions?.length || 0) - 1) {
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
    
    const totalQuestions = battle?.questions?.length || 0;
    const correctAnswers = Object.entries(selectedAnswers).filter(([index, answer]) => {
      const question = battle?.questions?.[parseInt(index)];
      return answer === (question?.correct_answer || question?.answer);
    }).length;

    const results = {
      score: correctAnswers * 10,
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

  const isWaitingForAcceptance = () => {
    if (!battle || !user) return false;
    return battle.status === 'pending' && battle.challenger_id === user.id;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
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

  const currentQuestion = battle.questions?.[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / (battle.questions?.length || 1)) * 100;
  const answeredQuestions = Object.keys(selectedAnswers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Battle Header */}
        <SimpleBattleHeader
          battle={battle}
          currentUserId={user?.id || ''}
          timeRemaining={timeRemaining}
          myScore={myScore}
          opponentScore={opponentScore}
          isStarted={battleStarted}
        />

        {/* Battle Status */}
        {!battleStarted ? (
          <Card className="mb-6">
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>
              
              {canAcceptChallenge() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    Challenge Received!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    {battle.challenger?.username || 'Someone'} has challenged you to a quiz battle!
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {battle.question_count || 10} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-4 h-4" />
                      {Math.floor((battle.time_limit || 600) / 60)} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {battle.difficulty || 'Medium'} difficulty
                    </span>
                  </div>
                  <Button
                    onClick={() => acceptChallengeMutation.mutate()}
                    disabled={acceptChallengeMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
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
              ) : isWaitingForAcceptance() ? (
                <>
                  <h3 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                    ⏳ Waiting for Response
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Your challenge has been sent! The battle will start when your opponent accepts.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Waiting for opponent to accept...
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Preparing Battle
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    The battle will begin once your opponent accepts the challenge.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
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
                <span>Question {currentQuestionIndex + 1} of {battle.questions?.length || 0}</span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {answeredQuestions} answered
                </span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Question Display */}
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SimpleQuestionDisplay
                question={currentQuestion}
                questionIndex={currentQuestionIndex}
                totalQuestions={battle.questions?.length || 0}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
                onAnswerSelect={(answer) => handleAnswerSelect(currentQuestionIndex, answer)}
                disabled={isCompleting}
              />
            </motion.div>

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
                        <>Time remaining: <span className="font-bold text-blue-600">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span></>
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
                    ) : currentQuestionIndex === (battle.questions?.length || 0) - 1 ? (
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
