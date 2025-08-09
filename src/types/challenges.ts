// Types for Friend Challenges system

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

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'image_based';
  question_text: string;
  options: string[];
  correct_answer: string;
  image_url?: string;
}

export interface ChallengeBattle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'expired';
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  time_limit: number;
  questions: Question[];
  created_at: string;
  expires_at: string;
  started_at?: string;
  completed_at?: string;
  challenger?: Profile;
  opponent?: Profile;
  participants?: BattleParticipant[];
}

export interface BattleParticipant {
  id: string;
  battle_id: string;
  user_id: string;
  answers: BattleAnswer[];
  score: number;
  accuracy: number;
  time_taken: number;
  completed_at?: string;
  is_winner?: boolean;
  user?: Profile;
}

export interface BattleAnswer {
  questionIndex: number;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface BattleEvent {
  id: string;
  battle_id: string;
  user_id: string;
  event_type: 'joined' | 'answered' | 'completed' | 'left' | 'started';
  data: any;
  created_at: string;
}

export interface BattleResults {
  battle: ChallengeBattle;
  myParticipant: BattleParticipant;
  opponentParticipant: BattleParticipant;
  isWinner: boolean;
  events: BattleEvent[];
}

export interface CreateChallengeParams {
  opponentEmail: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
}

export interface BattleStats {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScore: number;
  averageAccuracy: number;
  fastestTime: number;
}

// Real-time event types
export interface RealTimeEvent {
  eventType: 'battle_updated' | 'participant_joined' | 'answer_submitted' | 'battle_completed';
  battleId: string;
  userId: string;
  data: any;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface FriendsApiResponse extends ApiResponse<FriendRelationship[]> {}
export interface BattleApiResponse extends ApiResponse<ChallengeBattle> {}
export interface BattlesApiResponse extends ApiResponse<ChallengeBattle[]> {}
export interface CreateBattleResponse extends ApiResponse<{ battleId: string }> {}

// Component props types
export interface FriendCardProps {
  friendship: FriendRelationship;
  onChallenge: (friendEmail: string) => void;
  onRemove?: (friendshipId: string) => void;
}

export interface BattleCardProps {
  battle: ChallengeBattle;
  currentUserId: string;
  onJoin?: (battleId: string) => void;
  onViewResults?: (battleId: string) => void;
}

export interface QuestionDisplayProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  onAnswerSelect: (answer: string) => void;
  timeRemaining: number;
  disabled?: boolean;
}

export interface BattleProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  opponentProgress: number;
  myScore: number;
  opponentScore: number;
}

// Form types
export interface SendFriendRequestForm {
  email: string;
}

export interface CreateChallengeForm {
  opponentEmail: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: 5 | 10 | 20;
  timeLimit: 300 | 600 | 900; // 5, 10, 15 minutes
}

// Filter and sort types
export interface BattleFilters {
  status: 'all' | 'pending' | 'active' | 'completed';
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

export interface BattleSortOptions {
  field: 'created_at' | 'score' | 'accuracy' | 'time_taken';
  direction: 'asc' | 'desc';
}

// Notification types
export interface ChallengeNotification {
  id: string;
  type: 'friend_request' | 'challenge_received' | 'challenge_accepted' | 'battle_completed';
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'battle_event' | 'friend_update' | 'notification';
  payload: any;
}

export interface BattleWebSocketEvent {
  battleId: string;
  eventType: 'user_joined' | 'answer_submitted' | 'battle_completed' | 'opponent_left';
  userId: string;
  data: any;
  timestamp: string;
}
