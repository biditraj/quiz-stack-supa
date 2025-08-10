import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Target, 
  Clock, 
  Zap,
  Award,
  Medal,
  RotateCcw,
  Home,
  Share2,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Star,
  TrendingUp,
  Timer,
  Users,
  Sword
} from 'lucide-react';
import { challengesApi } from '@/lib/challenges-api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import type { BattleResults as BattleResultsType } from '@/types/challenges';

interface ScoreDisplayProps {
  participant: any;
  isWinner: boolean;
  isUser: boolean;
  title: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ participant, isWinner, isUser, title }) => {
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card className={`relative overflow-hidden ${isWinner ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 dark:border-yellow-600' : 'border-gray-200 dark:border-gray-700'}`}>
      {isWinner && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-400 to-amber-500 rounded-bl-3xl flex items-start justify-end p-2">
          <Trophy className="w-6 h-6 text-white" />
        </div>
      )}
      
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-2">
          <Avatar className="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <AvatarFallback className={`rounded-lg font-bold text-lg ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'}`}>
              {getInitials(participant?.user?.username || participant?.user?.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-lg">
          {isUser ? 'You' : participant?.user?.username}
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${isWinner ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {participant?.score || 0}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
        </div>

        <Separator />

        {/* Detailed Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Target className="w-4 h-4" />
              Accuracy
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.round((participant?.accuracy || 0) * 100)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Timer className="w-4 h-4" />
              Time Taken
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.floor((participant?.time_taken || 0) / 60)}:{((participant?.time_taken || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Zap className="w-4 h-4" />
              Speed
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {participant?.time_taken > 0 ? Math.round((participant?.answers?.length || 0) / (participant?.time_taken / 60)) : 0} q/min
            </span>
          </div>
        </div>

        {/* Accuracy Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Accuracy Progress</span>
            <span>{Math.round((participant?.accuracy || 0) * 100)}%</span>
          </div>
          <Progress 
            value={(participant?.accuracy || 0) * 100} 
            className={`h-2 ${isWinner ? '[&>div]:bg-yellow-500' : '[&>div]:bg-blue-500'}`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

interface QuestionReviewProps {
  question: any;
  index: number;
  userAnswer?: string;
  opponentAnswer?: string;
  userCorrect: boolean;
  opponentCorrect: boolean;
}

const QuestionReview: React.FC<QuestionReviewProps> = ({ 
  question, 
  index, 
  userAnswer, 
  opponentAnswer, 
  userCorrect, 
  opponentCorrect 
}) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Question {index + 1}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={userCorrect ? "default" : "destructive"} className="text-xs">
              You: {userCorrect ? 'Correct' : 'Wrong'}
            </Badge>
            <Badge variant={opponentCorrect ? "default" : "destructive"} className="text-xs">
              Opponent: {opponentCorrect ? 'Correct' : 'Wrong'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-900 dark:text-white mb-4">{question.question_text}</p>
        
        <div className="space-y-2">
          {question.options.map((option: string, optionIndex: number) => {
            const isCorrect = option === question.correct_answer;
            const userSelected = option === userAnswer;
            const opponentSelected = option === opponentAnswer;
            
            return (
              <div
                key={optionIndex}
                className={`p-3 rounded-lg border transition-colors ${
                  isCorrect 
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600' 
                    : (userSelected || opponentSelected) 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-white">{option}</span>
                  <div className="flex items-center gap-2">
                    {isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {userSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600" />}
                    {userSelected && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                    {opponentSelected && (
                      <Badge variant="outline" className="text-xs">Opponent</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default function BattleResults() {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['battle-results', battleId],
    queryFn: () => challengesApi.getBattleResults(battleId!),
    enabled: !!battleId,
  });

  const createRematchMutation = useMutation({
    mutationFn: () => {
      if (!results) throw new Error('No battle data');
      const opponent = results.battle.challenger_id === user?.id ? results.battle.opponent : results.battle.challenger;
      return challengesApi.createChallenge({
        opponentEmail: opponent?.email || '',
        difficulty: results.battle.difficulty,
        questionCount: results.battle.question_count,
        category: results.battle.category
      });
    },
    onSuccess: () => {
      toast({ title: 'Rematch challenge sent!' });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      navigate('/challenges');
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to create rematch', 
        description: error.message 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading battle results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <h3 className="text-xl font-semibold mb-2">Results Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to load battle results.
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

  const { battle, myParticipant, opponentParticipant, isWinner } = results;
  const opponent = battle.challenger_id === user?.id ? battle.opponent : battle.challenger;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            Battle Results
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {isWinner ? 'Congratulations! You won!' : myParticipant.is_winner === false ? 'Better luck next time!' : 'It\'s a draw!'}
          </p>
        </motion.div>

        {/* Battle Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sword className="w-5 h-5" />
                Battle Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {battle.category || 'Mixed'}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {battle.difficulty}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Difficulty</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {battle.question_count}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Questions</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.floor(battle.time_limit / 60)} min
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time Limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <ScoreDisplay
            participant={myParticipant}
            isWinner={isWinner}
            isUser={true}
            title="Your Performance"
          />
          <ScoreDisplay
            participant={opponentParticipant}
            isWinner={!isWinner && opponentParticipant.is_winner === true}
            isUser={false}
            title="Opponent Performance"
          />
        </motion.div>

        {/* Performance Comparison Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Score Comparison */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Score</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {myParticipant.score} vs {opponentParticipant.score}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(myParticipant.score / Math.max(myParticipant.score + opponentParticipant.score, 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all duration-1000"
                        style={{ width: `${(opponentParticipant.score / Math.max(myParticipant.score + opponentParticipant.score, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Accuracy Comparison */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Accuracy</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(myParticipant.accuracy * 100)}% vs {Math.round(opponentParticipant.accuracy * 100)}%
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-blue-500 transition-all duration-1000"
                        style={{ width: `${myParticipant.accuracy * 50}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all duration-1000"
                        style={{ width: `${opponentParticipant.accuracy * 50}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Speed Comparison (Inverse of time taken) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Speed</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.floor(myParticipant.time_taken / 60)}:{(myParticipant.time_taken % 60).toString().padStart(2, '0')} vs {Math.floor(opponentParticipant.time_taken / 60)}:{(opponentParticipant.time_taken % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-blue-500 transition-all duration-1000"
                        style={{ width: `${(1 / (myParticipant.time_taken || 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all duration-1000"
                        style={{ width: `${(1 / (opponentParticipant.time_taken || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Question-by-Question Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Question Review
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review each question and see how you both performed
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {battle.questions.map((question: any, index: number) => {
                  const userAnswer = myParticipant.answers?.find((a: any) => a.questionIndex === index);
                  const opponentAnswer = opponentParticipant.answers?.find((a: any) => a.questionIndex === index);
                  
                  return (
                    <QuestionReview
                      key={question.id}
                      question={question}
                      index={index}
                      userAnswer={userAnswer?.selectedAnswer}
                      opponentAnswer={opponentAnswer?.selectedAnswer}
                      userCorrect={userAnswer?.isCorrect || false}
                      opponentCorrect={opponentAnswer?.isCorrect || false}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => createRematchMutation.mutate()}
            disabled={createRematchMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {createRematchMutation.isPending ? 'Sending...' : `Challenge ${opponent?.username} Again`}
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/challenges">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Challenges
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
