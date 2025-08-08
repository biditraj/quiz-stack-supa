import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getQuizQuestions, getTopicQuestions } from "@/lib/questions";
import { getTriviaQuestions } from "@/lib/trivia";
import { useToast } from "@/components/ui/use-toast";

type Question = {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options: any;
  image_url?: string | null;
};

export default function QuizPage() {
  const { toast } = useToast();
  const [started, setStarted] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [numQuestions, setNumQuestions] = useState<5 | 10 | 20>(10);
  const categoryPresets = [
    { key: 'Technology', emoji: '💻' },
    { key: 'Science', emoji: '🔬' },
    { key: 'History', emoji: '🏺' },
    { key: 'Geography', emoji: '🗺️' },
    { key: 'Movies & TV', emoji: '🎬' },
    { key: 'Sports', emoji: '🏅' },
    { key: 'Random', emoji: '🎲' },
  ];

  const { data: triviaQs, isLoading } = useQuery({
    queryKey: ["topic-questions", topic, difficulty, numQuestions, started],
    queryFn: async () => {
      if (!started) return [] as any[];
      const count = numQuestions;
      const trimmed = topic.trim();
      // 1) Try Gemini topic questions if topic provided
      if (trimmed.length > 0) {
        const topicQs = await getTopicQuestions(trimmed, count);
        if (topicQs.length) return topicQs as any[];
      }
      // 2) Try OpenTrivia with chosen difficulty
      const trivia = await getTriviaQuestions({ amount: count, difficulty, type: 'multiple' });
      if (trivia.length) return trivia as any[];
      // 3) Fall back to Supabase stored questions
      return (await getQuizQuestions(count)) as any[];
    },
  });
  const questions: Question[] = (triviaQs as any) ?? [];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [startAt] = useState(() => Date.now());

  const current = questions[index];
  const progress = useMemo(() => (questions.length ? (index / questions.length) * 100 : 0), [index, questions.length]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [index]);

  const handleSubmitAnswer = () => {
    if (!current) return;
    const value = selected[current.id];
    if (value == null) return;
    const correct = String(value).trim().toLowerCase() === String((current as any).correct_answer ?? "").trim().toLowerCase();
    setCorrectMap((m) => ({ ...m, [current.id]: correct }));
  };

  const showNext = () => setIndex((i) => Math.min(i + 1, questions.length));

  const isAnswered = current && correctMap[current.id] != null;

  const finishAndSubmit = async () => {
    const total = questions.length;
    const correctCount = Object.values(correctMap).filter(Boolean).length;
    const elapsedSec = Math.max(1, Math.round((Date.now() - startAt) / 1000));
    const accuracyFraction = total > 0 ? correctCount / total : 0; // 0..1 for DB
    const accuracyPercent = Math.round(accuracyFraction * 100); // for UI
    const speed = Math.round((total / elapsedSec) * 60); // questions per minute
    try {
      await api.submitQuiz({ score: correctCount, accuracy: accuracyFraction, speed });
      toast({ title: "Results saved", description: `Score ${correctCount}/${total}, Acc ${accuracyPercent}%` });
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Edge Function returned a non-2xx status code';
      toast({ variant: "destructive", title: "Could not save results", description: message });
    }
  };

  if (!started) {
    return (
      <div className="container py-10">
        <Card className="max-w-2xl mx-auto bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Start a Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic search */}
            <div>
              <label className="block text-sm mb-2">Search a topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., JavaScript, World History, Space, Movies..."
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </div>

            {/* Category grid */}
            <div>
              <label className="block text-sm mb-2">Or pick a category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categoryPresets.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setTopic(c.key === 'Random' ? '' : c.key)}
                    className={`rounded-xl border px-3 py-4 text-sm hover:shadow-md transition ${topic === c.key ? 'border-blue-500' : ''}`}
                  >
                    <div className="text-2xl mb-1">{c.emoji}</div>
                    <div className="font-medium">{c.key}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm mb-2">Difficulty</label>
              <div className="flex gap-2">
                {(['easy','medium','hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-md border px-3 py-2 text-sm capitalize ${difficulty === d ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of questions */}
            <div>
              <label className="block text-sm mb-2">Number of Questions</label>
              <div className="flex gap-2">
                {([5,10,20] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumQuestions(n)}
                    className={`rounded-md border px-3 py-2 text-sm ${numQuestions === n ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => setStarted(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Start Quiz</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="container py-20 text-center">
        <p className="text-gray-600 dark:text-gray-300">No questions available yet.</p>
      </div>
    );
  }

  if (index >= questions.length) {
    const total = questions.length;
    const correctCount = Object.values(correctMap).filter(Boolean).length;
    const accuracy = Math.round((correctCount / total) * 100);
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Score: {correctCount} / {total}</p>
            <p>Accuracy: {accuracy}%</p>
            <div className="flex gap-3">
              <Button onClick={finishAndSubmit} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Save to Leaderboard</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Progress value={progress} className="h-2 overflow-hidden">
          {/* progress bar styled by component */}
        </Progress>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Question {index + 1} of {questions.length}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current?.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="max-w-3xl mx-auto bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle>{current.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {current.image_url && (
                <img src={current.image_url} alt="question" className="w-full rounded-lg" />
              )}

              {current.type === "multiple_choice" && (
                <RadioGroup
                  value={selected[current.id] || ""}
                  onValueChange={(v) => setSelected((s) => ({ ...s, [current.id]: v }))}
                  className="space-y-3"
                >
                  {Array.isArray(current.options) && current.options.map((opt: string) => (
                    <label key={opt} className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer ${isAnswered ? (String(opt) === String((current as any).correct_answer) ? 'border-green-500 bg-green-50/60' : (selected[current.id] === opt ? 'border-red-500 bg-red-50/60' : '')) : ''}`}>
                      <RadioGroupItem value={opt} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {current.type === "true_false" && (
                <div className="grid grid-cols-2 gap-3">
                  {["True", "False"].map((opt) => (
                    <Button
                      key={opt}
                      variant={selected[current.id] === opt ? "default" : "outline"}
                      onClick={() => setSelected((s) => ({ ...s, [current.id]: opt }))}
                      className={`${selected[current.id] === opt ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : ''}`}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}

              {current.type === "fill_blank" && (
                <Input
                  placeholder="Type your answer"
                  value={selected[current.id] || ""}
                  onChange={(e) => setSelected((s) => ({ ...s, [current.id]: e.target.value }))}
                />
              )}

              {current.type === "image_based" && (
                <RadioGroup
                  value={selected[current.id] || ""}
                  onValueChange={(v) => setSelected((s) => ({ ...s, [current.id]: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {Array.isArray(current.options) && current.options.map((opt: any) => (
                    <label key={opt.value} className={`rounded-lg overflow-hidden border cursor-pointer ${isAnswered ? (String(opt.value) === String((current as any).correct_answer) ? 'border-green-500' : (selected[current.id] === opt.value ? 'border-red-500' : '')) : ''}`}>
                      <img src={opt.image_url} alt={opt.label} className="h-36 w-full object-cover" />
                      <div className="p-2">
                        <input type="radio" className="mr-2" value={opt.value} checked={selected[current.id] === opt.value} readOnly />
                        <span>{opt.label}</span>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              <div className="mt-6 flex gap-3">
                {!isAnswered ? (
                  <Button onClick={handleSubmitAnswer} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Check Answer</Button>
                ) : (
                  <>
                    <Button onClick={showNext} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Next</Button>
                    <div className={`ml-2 text-sm font-medium ${correctMap[current.id] ? 'text-green-600' : 'text-red-600'}`}>
                      {correctMap[current.id] ? 'Correct!' : 'Not quite.'}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


