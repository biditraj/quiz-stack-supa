import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { fetchQuestionsFromAI, fetchQuestionsFromDB, getQuizQuestions, getTopicQuestions } from "@/lib/questions";
import { getTriviaQuestions } from "@/lib/trivia";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from 'lucide-react';
import {
  Cpu,
  Database,
  Code2,
  Calculator,
  Server,
  GitBranch,
  BarChart3,
  BookOpenText,
  Brain,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { getLocalQuestionsByCategory } from "@/lib/local-questions";

type Question = {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank" | "image_based";
  question_text: string;
  options: any;
  image_url?: string | null;
};

export default function QuizPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [started, setStarted] = useState(false);
  const [startMode, setStartMode] = useState<'db' | 'ai' | 'auto'>("auto");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: categories } = useQuery<{ category: string; question_count: number }[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await api.listCategories();
        const data = (res as any)?.data || [];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {}
      const { data: qs, error } = await supabase
        .from('questions')
        .select('category')
        .limit(2000);
      if (error || !Array.isArray(qs)) return [];
      const map = new Map<string, number>();
      for (const row of qs as any[]) {
        const c = String(row?.category || 'General');
        map.set(c, (map.get(c) || 0) + 1);
      }
      return Array.from(map.entries())
        .map(([category, question_count]) => ({ category, question_count }))
        .sort((a, b) => a.category.localeCompare(b.category));
    },
  });
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [numQuestions, setNumQuestions] = useState<5 | 10 | 20>(10);
  // Category icon and style mapping
  const resolveCategoryConfig = (name: string | undefined | null): { icon: LucideIcon; gradient: string } => {
    const s = String(name || '').trim().toLowerCase();
    const contains = (k: string) => s.includes(k);
    if (contains('operating') || contains('os')) return { icon: Cpu, gradient: 'from-blue-500 to-indigo-600' };
    if (contains('database') || contains('sql')) return { icon: Database, gradient: 'from-sky-500 to-blue-600' };
    if (contains('program') || contains('coding') || contains('fundament')) return { icon: Code2, gradient: 'from-indigo-500 to-purple-600' };
    if (contains('quant') || contains('aptitude') || contains('math') || contains('numer')) return { icon: Calculator, gradient: 'from-emerald-500 to-teal-600' };
    if (contains('network')) return { icon: Server, gradient: 'from-cyan-500 to-sky-600' };
    if (contains('algorithm')) return { icon: GitBranch, gradient: 'from-fuchsia-500 to-pink-600' };
    if (contains('data structure')) return { icon: GitBranch, gradient: 'from-rose-500 to-red-600' };
    if (contains('logic') || contains('reason')) return { icon: Brain, gradient: 'from-amber-500 to-orange-600' };
    if (contains('data inter') || contains('interpret') || contains('chart') || contains('stat')) return { icon: BarChart3, gradient: 'from-lime-500 to-green-600' };
    if (contains('verbal') || contains('english') || contains('vocab')) return { icon: BookOpenText, gradient: 'from-teal-500 to-emerald-600' };
    return { icon: Sparkles, gradient: 'from-slate-500 to-gray-600' };
  };

  const categoryPresets = (categories || []).map((c) => ({ key: c.category, count: c.question_count }));

  const { data: triviaQs, isLoading } = useQuery({
    queryKey: ["topic-questions", topic, difficulty, numQuestions, started, startMode],
    queryFn: async () => {
      if (!started) return [] as any[];
      const count = numQuestions;
      const trimmed = topic.trim();
      if (startMode === 'db') {
        // Use Supabase DB. Support category or topic.
        if (selectedCategory && selectedCategory.trim()) {
          const [res, local] = await Promise.all([
            api.getQuestionsByCategory(count, selectedCategory, true),
            Promise.resolve(getLocalQuestionsByCategory(selectedCategory, count * 2)),
          ]);
          const supaList = (((res as any)?.data || []) as any[]);
          const localList = Array.isArray(local) ? (local as any[]) : [];
          const seen = new Set<string>();
          const merged: any[] = [];
          const addUnique = (arr: any[]) => {
            for (const q of arr) {
              const key = String((q as any).question_text || '').trim().toLowerCase();
              if (!key || seen.has(key)) continue;
              seen.add(key);
              merged.push(q);
            }
          };
          addUnique(supaList);
          addUnique(localList);
          return merged.slice(0, count) as any[];
        }
        const dbQs = await fetchQuestionsFromDB(trimmed, difficulty, count);
        return dbQs as any[];
      } else if (startMode === 'ai') {
        // Use Gemini AI strictly
        const aiQs = await fetchQuestionsFromAI(trimmed || 'general knowledge', difficulty, count);
        if (aiQs.length) return aiQs as any[];
      } else {
        // Auto: original fallback chain
        if (trimmed.length > 0) {
          const topicQs = await getTopicQuestions(trimmed, count);
          if (topicQs.length) return topicQs as any[];
        }
        const trivia = await getTriviaQuestions({ amount: count, difficulty, type: 'multiple' });
        if (trivia.length) return trivia as any[];
      }
      // Fall back to random from DB
      return (await getQuizQuestions(count)) as any[];
    },
  });
  const questions: Question[] = (triviaQs as any) ?? [];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [startAt] = useState(() => Date.now());

  // Auto-select category and optionally auto-start via URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const autoStart = params.get('start');
    if (categoryParam && categoryParam.trim()) {
      setSelectedCategory(categoryParam.trim());
    }
    if (autoStart === '1') {
      setStartMode('db');
      setStarted(true);
    }
  }, [location.search]);

  const current = questions[index];
  const progress = useMemo(() => (questions.length ? (index / questions.length) * 100 : 0), [index, questions.length]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [index]);

  const autoNextTimer = useRef<number | null>(null);

  const registerAnswer = (value: string) => {
    if (!current) return;
    const qid = current.id;
    setSelected((s) => ({ ...s, [qid]: value }));
    const correct = String(value).trim().toLowerCase() === String((current as any).correct_answer ?? "").trim().toLowerCase();
    setCorrectMap((m) => ({ ...m, [qid]: correct }));

    if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    autoNextTimer.current = window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, questions.length));
    }, 900);
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
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    // Start AI-generated quiz directly
                    setStartMode('ai');
                    setStarted(true);
                  }
                }}
                placeholder="e.g., JavaScript, World History, Space, Movies..."
                className="w-full rounded-md border bg-background px-3 py-2"
              />
              <div className="text-xs text-gray-500 mt-1">Press Enter to start an AI-generated quiz</div>
            </div>

            {/* Category grid */}
            <div>
              <label className="block text-sm mb-2">Or pick a category</label>
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                }}
              >
                {categoryPresets.map((c) => {
                  const cfg = resolveCategoryConfig(c.key);
                  const Icon = cfg.icon;
                  const isActive = selectedCategory === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={async () => {
                        setSelectedCategory(c.key);
                        setTopic('');
                      }}
                      className={`rounded-xl border px-3 py-3 text-left hover:shadow-md transition ${isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-r ${cfg.gradient} grid place-items-center text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 whitespace-normal break-words">
                          <div className="font-medium leading-snug break-keep">{c.key}</div>
                          <div className="text-xs text-gray-500">{c.count ?? 0} {Number(c.count) === 1 ? 'question' : 'questions'}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-2 shrink-0 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="text-center">
              <label className="block text-sm mb-2">Difficulty</label>
              {(() => {
                const options = [
                  { key: 'easy' as const, label: 'Easy', glow: 'from-emerald-400 to-emerald-600' },
                  { key: 'medium' as const, label: 'Medium', glow: 'from-amber-400 to-orange-600' },
                  { key: 'hard' as const, label: 'Hard', glow: 'from-rose-500 to-red-600' },
                ];
                const idxMap: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 1, hard: 2 };
                const activeIdx = idxMap[difficulty];
                const activeGlow = options[activeIdx].glow;
                return (
                  <div className="mx-auto w-full max-w-xs select-none">
                    <div className="relative rounded-lg border bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-sm overflow-hidden">
                      {/* Animated highlight */}
                      <div
                        className={`absolute top-1 bottom-1 left-1 w-1/3 rounded-md bg-gradient-to-r ${activeGlow} transition-transform duration-300 ease-out`}
                        style={{ transform: `translateX(${activeIdx * 100}%)` }}
                        aria-hidden="true"
                      />
                      <div className="relative grid grid-cols-3">
                        {options.map((opt, i) => {
                          const isActive = opt.key === difficulty;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={`relative z-10 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                                isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}
                              onClick={() => setDifficulty(opt.key)}
                              aria-pressed={isActive}
                            >
                              <span
                                className={`inline-block px-2 transition-transform ${isActive ? 'scale-105' : 'opacity-80 group-hover:opacity-100'}`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {/* subtle glow on hover */}
                      <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Number of questions */}
            <div className="text-center">
              <label className="block text-sm mb-2">Number of Questions</label>
              {(() => {
                const options = [
                  { key: 5 as const, label: '5', glow: 'from-sky-400 to-blue-600' },
                  { key: 10 as const, label: '10', glow: 'from-violet-400 to-indigo-600' },
                  { key: 20 as const, label: '20', glow: 'from-fuchsia-400 to-pink-600' },
                ];
                const idxMap: Record<5 | 10 | 20, number> = { 5: 0, 10: 1, 20: 2 };
                const activeIdx = idxMap[numQuestions];
                const activeGlow = options[activeIdx].glow;
                return (
                  <div className="mx-auto w-full max-w-xs select-none">
                    <div className="relative rounded-lg border bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-sm overflow-hidden">
                      <div
                        className={`absolute top-1 bottom-1 left-1 w-1/3 rounded-md bg-gradient-to-r ${activeGlow} transition-transform duration-300 ease-out`}
                        style={{ transform: `translateX(${activeIdx * 100}%)` }}
                        aria-hidden="true"
                      />
                      <div className="relative grid grid-cols-3">
                        {options.map((opt) => {
                          const isActive = opt.key === numQuestions;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={`relative z-10 py-2 text-sm font-medium transition-all duration-200 ${
                                isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}
                              onClick={() => setNumQuestions(opt.key)}
                              aria-pressed={isActive}
                            >
                              <span className={`inline-block px-2 ${isActive ? 'scale-105' : 'opacity-80'}`}>
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                onClick={() => {
                  // For categories, pass selected category to backend
                  const chosen = selectedCategory || '';
                  setTopic('');
                  // Store category in selectedCategory; fetch happens in queryFn below
                  setStartMode('db');
                  setStarted(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              >
                Start from DB
              </Button>
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
        {selectedCategory && (
          <div className="mt-2">
            <Badge variant="secondary">Category: {selectedCategory}</Badge>
          </div>
        )}
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
                  onValueChange={(v) => registerAnswer(v)}
                  className="space-y-3"
                >
                  {Array.isArray(current.options) && current.options.map((opt: string, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <label key={opt} className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer hover-scale animate-fade-in ${isAnswered ? (String(opt) === String((current as any).correct_answer) ? 'border-green-500 bg-green-50/60' : (selected[current.id] === opt ? 'border-red-500 bg-red-50/60' : '')) : ''}`}>
                        <RadioGroupItem value={opt} disabled={isAnswered} />
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium">{letter}</span>
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}

              {current.type === "true_false" && (
                <div className="grid grid-cols-2 gap-3">
                  {["True", "False"].map((opt) => (
                    <Button
                      key={opt}
                      variant={selected[current.id] === opt ? "default" : "outline"}
                      onClick={() => registerAnswer(opt)}
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
                  onValueChange={(v) => registerAnswer(v)}
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

              {isAnswered && (
                <div className={`mt-4 text-sm font-medium ${correctMap[current.id] ? 'text-green-600' : 'text-red-600'}`}>
                  {correctMap[current.id] ? 'Correct!' : 'Not quite.'}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


