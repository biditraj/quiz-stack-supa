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
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
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
  Clock,
  Hourglass,
  Loader2,
} from 'lucide-react';
import { getLocalQuestionsByCategory } from "@/lib/local-questions";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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
  // Mode + per-question timer
  const [mode, setMode] = useState<'study' | 'timed'>('study');
  const [perQuestionSec, setPerQuestionSec] = useState<10 | 20 | 30>(20);
  const [remainingSec, setRemainingSec] = useState<number>(20);
  const tickRef = useRef<number | null>(null);
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

  const { data: triviaQs, isLoading, isFetching, error } = useQuery({
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
        // Use AI only - no database fallback
        try {
          const aiQs = await fetchQuestionsFromAI(trimmed || 'general knowledge', difficulty, count);
          return aiQs as any[];
        } catch (error) {
          console.error('AI generation failed:', error);
          // Check if it's a quota exceeded error
          if (error instanceof Error && error.message.includes('QUOTA_EXCEEDED')) {
            throw new Error('QUOTA_EXCEEDED: Daily API quota limit reached. Please try again tomorrow or upgrade your plan.');
          }
          throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Auto: original fallback chain
        if (trimmed.length > 0) {
          const topicQs = await getTopicQuestions(trimmed, count);
          if (topicQs.length) return topicQs as any[];
        }
        const trivia = await getTriviaQuestions({ amount: count, difficulty, type: 'multiple' });
        if (trivia.length) return trivia as any[];
      }
      // Fall back to random from DB for non-AI modes only
      return (await getQuizQuestions(count)) as any[];
    },
  });
  const questions: Question[] = (triviaQs as any) ?? [];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [startAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<null | {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    recommendedTopics: string[];
  }>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [regen, setRegen] = useState(0);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const buildRecommendedTopics = (base: string | null | undefined): string[] => {
    const s = String(base || '').toLowerCase();
    const rec: string[] = [];
    const add = (...arr: string[]) => { for (const x of arr) if (x && !rec.includes(x)) rec.push(x); };
    if (s.includes('operating') || s.includes('os')) add('CPU Scheduling', 'Memory Management', 'Deadlocks', 'File Systems');
    if (s.includes('database') || s.includes('sql')) add('Normalization', 'Joins', 'Transactions', 'Indexing');
    if (s.includes('program') || s.includes('coding') || s.includes('fundament')) add('Data Types', 'Control Flow', 'Functions', 'OOP Basics');
    if (s.includes('quant') || s.includes('aptitude') || s.includes('math') || s.includes('numer')) add('Percentages', 'Ratios', 'Combinatorics', 'Series');
    if (s.includes('network')) add('OSI Model', 'TCP/UDP', 'Routing & Switching');
    if (s.includes('algorithm')) add('Sorting', 'Searching', 'Greedy vs DP');
    if (s.includes('data structure')) add('Arrays & Strings', 'Stacks & Queues', 'Trees & Graphs');
    if (s.includes('logic') || s.includes('reason')) add('Propositional Logic', 'Puzzles', 'Venn Diagrams');
    if (s.includes('data inter') || s.includes('interpret') || s.includes('chart') || s.includes('stat')) add('Averages', 'Variance', 'Trend Analysis');
    if (s.includes('verbal') || s.includes('english') || s.includes('vocab')) add('Synonyms & Antonyms', 'Reading Comprehension', 'Sentence Correction');
    if (rec.length === 0) {
      const t = String(topic || selectedCategory || 'General');
      add(`${t} basics`, `${t} practice`, `${t} tricky questions`);
    }
    return rec.slice(0, 6);
  };

  const buildLocalSummary = (args: {
    total: number;
    correct: number;
    elapsedSec: number;
    speedQpm: number;
    wrongCount: number;
  }): {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    recommendedTopics: string[];
  } => {
    const { total, correct, elapsedSec, speedQpm, wrongCount } = args;
    const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];
    if (accuracyPct >= 85) strengths.push('High accuracy across questions');
    else if (accuracyPct >= 60) strengths.push('Solid foundation with room to grow');
    else strengths.push('Good persistence — keep practicing');
    if (speedQpm >= 10) strengths.push('Great pace');
    if (accuracyPct < 60) weaknesses.push('Focus on core fundamentals');
    if (speedQpm < 5) weaknesses.push('Pacing could be improved');
    if (wrongCount > 0) weaknesses.push(`Missed ${wrongCount} question${wrongCount === 1 ? '' : 's'}`);
    suggestions.push('Review the incorrect answers and read the explanations above');
    suggestions.push(`Practice ${numQuestions} new questions in ${selectedCategory || topic || 'your chosen topic'}`);
    if (mode === 'timed') suggestions.push(`Try another timed set (${perQuestionSec}s per question) to build pace`);
    else suggestions.push('Try a timed set to build pace and retention');
    const recommendedTopics = buildRecommendedTopics(selectedCategory || topic);
    const summary = `You answered ${correct} of ${total} correctly (${accuracyPct}%) in ${elapsedSec}s at ${speedQpm} qpm. Keep building momentum with targeted practice.`;
    return { summary, strengths, weaknesses, suggestions, recommendedTopics };
  };

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
  // Timed mode derived UI values
  const timeFraction = useMemo(() => (mode === 'timed' ? Math.max(0, Math.min(1, remainingSec / perQuestionSec)) : 0), [mode, remainingSec, perQuestionSec]);
  const timePercent = Math.round(timeFraction * 100);
  const ringColor = timeFraction > 0.5 ? '#22c55e' : (timeFraction > 0.25 ? '#f59e0b' : '#ef4444');

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [index]);

  const autoNextTimer = useRef<number | null>(null);

  const registerAnswer = (value: string) => {
    if (!current) return;
    // stop tick if running
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const qid = current.id;
    setSelected((s) => ({ ...s, [qid]: value }));
    const correct = String(value).trim().toLowerCase() === String((current as any).correct_answer ?? "").trim().toLowerCase();
    setCorrectMap((m) => ({ ...m, [qid]: correct }));

    if (autoNextTimer.current) window.clearTimeout(autoNextTimer.current);
    autoNextTimer.current = window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, questions.length));
    }, 900);
  };

  // Start/reset per-question countdown in Timed mode
  useEffect(() => {
    // clear old interval
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (!started || mode !== 'timed' || !questions.length) return;
    setRemainingSec(perQuestionSec);
    tickRef.current = window.setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          if (tickRef.current) {
            window.clearInterval(tickRef.current);
            tickRef.current = null;
          }
          const cur = questions[index];
          if (cur && correctMap[cur.id] == null) {
            setCorrectMap((m) => ({ ...m, [cur.id]: false }));
          }
          window.setTimeout(() => {
            setIndex((i) => Math.min(i + 1, questions.length));
          }, 300);
          return 0;
        }
        return s - 1;
      });
    }, 1000) as unknown as number;
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [index, mode, started, perQuestionSec, questions.length]);

  const showNext = () => setIndex((i) => Math.min(i + 1, questions.length));

  const isAnswered = current && correctMap[current.id] != null;
  const isFinished = index >= questions.length;

  // Request AI summary when quiz finishes
  useEffect(() => {
    if (!isFinished) return;
    if (!finishedAt) setFinishedAt(Date.now());
    let cancelled = false;
        const requestAiSummary = async () => {
      const key = ((import.meta as any).env?.VITE_QUESTIONS_API_KEY as string | undefined) ?? "AIzaSyBBNyXwqSL808ZNAb-pz4dl7FQw3FxDR_E";
      if (!key) {
        setAiError("AI key missing. Set VITE_QUESTIONS_API_KEY.");
        return;
      }
      try {
        setAiLoading(true);
        setAiError(null);
        const total = questions.length;
        const correctCount = Object.values(correctMap).filter(Boolean).length;
        const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        const endTime = finishedAt ?? Date.now();
        const elapsedSec = Math.max(1, Math.round((endTime - startAt) / 1000));
        const speedQpm = Math.round((total / elapsedSec) * 60);
        const brief = questions.map((q) => ({
          id: q.id,
          question: q.question_text,
          correct_answer: (q as any).correct_answer || "",
          user_answer: selected[q.id] ?? null,
          is_correct: !!correctMap[q.id],
          explanation: (q as any).explanation || null,
        }));

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const system = `You are an expert learning coach. Analyze a user's quiz attempt and produce:
        - summary: 2-3 sentence overview in simple, encouraging tone
        - strengths: array of short bullet points
        - weaknesses: array of short bullet points
        - suggestions: array of concrete study tips (actionable next steps)
        - recommended_topics: array of 3-6 topical suggestions to study next
        Return STRICT JSON only (no prose, no code fences) with keys exactly: summary, strengths, weaknesses, suggestions, recommended_topics.`;
        const payload = {
          total,
          correct: correctCount,
          accuracy_percent: accuracyPct,
          duration_sec: elapsedSec,
          speed_qpm: speedQpm,
          difficulty,
          category: selectedCategory,
          topic: topic,
          responses: brief,
        };
        const prompt = `${system}\n\nAttempt Data (JSON):\n${JSON.stringify(payload)}`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1) throw new Error("Unexpected AI response");
        const parsed = JSON.parse(text.slice(start, end + 1));
        if (cancelled) return;
        setAiSummary({
          summary: String(parsed.summary || ""),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          recommendedTopics: Array.isArray(parsed.recommended_topics)
            ? parsed.recommended_topics
            : (Array.isArray(parsed.recommendedTopics) ? parsed.recommendedTopics : []),
        });
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : String(err);
        // Fallback to local summary on quota / rate limit / network errors
        const total = questions.length;
        const correctCount = Object.values(correctMap).filter(Boolean).length;
        const endTime = finishedAt ?? Date.now();
        const elapsedSec = Math.max(1, Math.round((endTime - startAt) / 1000));
        const speedQpm = Math.round((total / elapsedSec) * 60);
        if (!cancelled) {
          const local = buildLocalSummary({
            total,
            correct: correctCount,
            elapsedSec,
            speedQpm,
            wrongCount: Math.max(0, total - correctCount),
          });
          setAiSummary(local);
          // Only surface error if not a quota/rate/network typical case
          const lower = message.toLowerCase();
          if (lower.includes('429') || lower.includes('quota') || lower.includes('rate') || lower.includes('fetch') || lower.includes('network')) {
            setAiError(null);
          } else {
            setAiError(message);
          }
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    requestAiSummary();
    return () => { cancelled = true; };
  }, [isFinished, regen, finishedAt]);

  const finishAndSubmit = async () => {
    const total = questions.length;
    const correctCount = Object.values(correctMap).filter(Boolean).length;
    const endTime = finishedAt ?? Date.now();
    const elapsedSec = Math.max(1, Math.round((endTime - startAt) / 1000));
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
      <div className="container min-h-[calc(100vh-4rem)] py-4 md:py-6 flex items-center">
        <Card className="w-full max-w-5xl mx-auto glass-light shadow-dark">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl dark-text">Start a Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {/* Topic search */}
                <div>
                  <label className="block text-xs mb-1 dark-text-secondary font-medium">Search a topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const t = (topic || '').trim();
                        if (!t) return;
                        setSelectedCategory(null);
                        setStartMode('ai');
                        setStarted(true);
                      }
                    }}
                    placeholder="e.g., JavaScript, World History, Space, Movies..."
                    className="w-full rounded-md border dark-input focus-ring transition-colors"
                  />
                  <div className="text-[11px] dark-text-muted mt-1">Press Enter to start an AI-generated quiz</div>
                </div>

                {/* Category selection (top picks + searchable browse) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs dark-text-secondary font-medium">Or pick a category</label>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs dark-button focus-ring" onClick={() => setCategoryPickerOpen(true)}>Browse all</Button>
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    {[...(categoryPresets || [])]
                      .sort((a, b) => (Number(b.count || 0) - Number(a.count || 0)))
                      .slice(0, 6)
                      .map((c) => {
                        const cfg = resolveCategoryConfig(c.key);
                        const Icon = cfg.icon;
                        const isActive = selectedCategory === c.key;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => { setSelectedCategory(c.key); setTopic(''); }}
                            className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-all duration-200 hover:shadow-md focus-ring ${
                              isActive 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md dark:shadow-blue-500/20' 
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            aria-pressed={isActive}
                            title={c.key}
                          >
                            <span className={`shrink-0 w-9 h-9 rounded-md bg-gradient-to-r ${cfg.gradient} grid place-items-center text-white shadow-sm`}>
                              <Icon className="w-4.5 h-4.5" />
                            </span>
                            <span className="min-w-0 truncate">
                              <span className="font-medium truncate dark-text">{c.key}</span>
                              <span className="ml-1 text-xs dark-text-muted">({c.count ?? 0})</span>
                            </span>
                            <ArrowRight className="ml-auto w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </button>
                        );
                      })}
                  </div>

                  <CommandDialog open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
                    <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
                      <CommandInput placeholder="Search categories..." className="dark-input" />
                      <CommandList className="max-h-[360px]">
                        <CommandEmpty>No categories found.</CommandEmpty>
                        <CommandGroup heading="All Categories">
                          {(categoryPresets || []).map((c) => (
                            <CommandItem
                              key={c.key}
                              onSelect={() => {
                                setSelectedCategory(c.key);
                                setTopic('');
                                setCategoryPickerOpen(false);
                              }}
                              className="dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <span className="text-sm font-medium dark-text truncate">{c.key}</span>
                                <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark-text-secondary">
                                  {c.count ?? 0}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </div>
                  </CommandDialog>
                </div>
              </div>

              <div className="space-y-3">
                {/* Difficulty */}
                <div>
                  <label className="block text-xs mb-1 dark-text-secondary font-medium">Difficulty</label>
                  {(() => {
                    const options = [
                      { key: 'easy' as const, label: 'Easy', gradient: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-300 dark:bg-emerald-400' },
                      { key: 'medium' as const, label: 'Medium', gradient: 'from-amber-400 to-orange-600', dot: 'bg-amber-300 dark:bg-amber-400' },
                      { key: 'hard' as const, label: 'Hard', gradient: 'from-rose-500 to-red-600', dot: 'bg-rose-300 dark:bg-rose-400' },
                    ];
                    return (
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-1 flex gap-1">
                        {options.map((opt) => {
                          const isActive = opt.key === difficulty;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setDifficulty(opt.key)}
                              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-ring ${
                                isActive
                                  ? `bg-gradient-to-r ${opt.gradient} text-white shadow-md`
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                {opt.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Number of Questions */}
                <div>
                  <label className="block text-xs mb-1 dark-text-secondary font-medium">Number of Questions</label>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-1 flex gap-1">
                    {([5, 10, 20] as const).map((count) => {
                      const isActive = count === numQuestions;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setNumQuestions(count)}
                          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-ring ${
                            isActive
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quiz Mode */}
                <div>
                  <label className="block text-xs mb-1 dark-text-secondary font-medium">Quiz Mode</label>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-1 flex gap-1">
                    {([
                      { key: 'study' as const, label: 'Study Mode', icon: BookOpenText },
                      { key: 'timed' as const, label: 'Timed Mode', icon: Clock },
                    ] as const).map((opt) => {
                      const isActive = opt.key === mode;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMode(opt.key)}
                          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-ring ${
                            isActive
                              ? 'bg-purple-500 text-white shadow-md'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timer Settings (only show for timed mode) */}
                {mode === 'timed' && (
                  <div>
                    <label className="block text-xs mb-1 dark-text-secondary font-medium">Time per Question</label>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-1 flex gap-1">
                      {([10, 20, 30] as const).map((sec) => {
                        const isActive = sec === perQuestionSec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setPerQuestionSec(sec)}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-ring ${
                              isActive
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {sec}s
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => {
                  // If user selected a category, start with DB; else default to DB
                  if (selectedCategory && selectedCategory.trim()) {
                    setTopic('');
                    setStartMode('db');
                    setStarted(true);
                    return;
                  }
                  // If user typed a topic, start with AI; else default to DB
                  if ((topic || '').trim().length > 0) {
                    setStartMode('ai');
                  } else {
                    setStartMode('db');
                  }
                  setStarted(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg dark:shadow-blue-500/25 focus-ring"
              >
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || (started && startMode === 'ai' && isFetching)) {
    return (
      <div className="container min-h-[calc(100vh-4rem)] py-10 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto glass-light shadow-dark">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 dark:text-blue-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 animate-spin"></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold dark-text">
                {startMode === 'ai' ? 'Generating AI Questions...' : 'Loading Quiz...'}
              </h3>
              <p className="text-sm dark-text-secondary">
                {startMode === 'ai' 
                  ? `Creating ${numQuestions} questions about "${topic}" (${difficulty} difficulty)`
                  : 'Preparing your quiz questions...'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!questions.length && !isLoading && !isFetching) {
    // Check for specific error types
    const isQuotaExceeded = error instanceof Error && error.message.includes('QUOTA_EXCEEDED');
    const isAIError = startMode === 'ai' && error instanceof Error;
    
    return (
      <div className="container min-h-[calc(100vh-4rem)] py-10 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto glass-light shadow-dark">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-center space-y-2">
              {isQuotaExceeded ? (
                <>
                  <div className="h-12 w-12 mx-auto text-amber-500 dark:text-amber-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold dark-text">
                    API Quota Exceeded
                  </h3>
                  <p className="text-sm dark-text-secondary">
                    Daily API limit reached. Please try again tomorrow or upgrade your plan.
                  </p>
                  <div className="text-xs dark-text-muted mt-2">
                    You can still use database questions by selecting a category below.
                  </div>
                </>
              ) : (
                <>
                  <Brain className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" />
                  <h3 className="text-lg font-semibold dark-text">
                    No Questions Available
                  </h3>
                  <p className="text-sm dark-text-secondary">
                    {isAIError 
                      ? `AI generation failed: ${error.message}`
                      : startMode === 'ai' 
                        ? `Could not generate questions for "${topic}". Try a different topic or check your connection.`
                        : 'No questions found for the selected criteria.'
                    }
                  </p>
                </>
              )}
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg dark:shadow-blue-500/25"
                >
                  Try Again
                </Button>
                {isQuotaExceeded && (
                  <Button 
                    onClick={() => {
                      setStartMode('db');
                      setStarted(false);
                      setTopic('');
                    }} 
                    variant="outline"
                    className="dark-button focus-ring"
                  >
                    Use Database
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const total = questions.length;
    const correctCount = Object.values(correctMap).filter(Boolean).length;
    const incorrectCount = Math.max(0, total - correctCount);
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const endTime = finishedAt ?? Date.now();
    const elapsedSec = Math.max(1, Math.round((endTime - startAt) / 1000));
    const speed = Math.round((total / elapsedSec) * 60);
    const pieData = [
      { key: 'correct', label: 'Correct', value: correctCount, fill: 'hsl(142, 76%, 36%)' },
      { key: 'incorrect', label: 'Incorrect', value: incorrectCount, fill: 'hsl(0, 84%, 60%)' },
    ];
    const chartConfig = {
      correct: { label: 'Correct', color: 'hsl(142, 76%, 36%)' },
      incorrect: { label: 'Incorrect', color: 'hsl(0, 84%, 60%)' },
    } as const;

    const wrongItems = questions.filter((q) => correctMap[q.id] === false).map((q) => ({
      id: q.id,
      question: q.question_text,
      correct: (q as any).correct_answer ?? "",
      selected: selected[q.id] ?? "",
      explanation: (q as any).explanation ?? null,
    }));

    const headline = accuracy >= 85 ? 'Excellent work!' : accuracy >= 60 ? 'Nice job, keep going!' : 'Good effort — practice will help!';

    return (
      <div className="container py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="glass-light shadow-dark">
            <CardHeader>
              <CardTitle className="dark-text">Quiz Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-gray-800/50 dark:to-transparent">
                <div className="text-xl font-semibold mb-1 dark-text">{headline}</div>
                <div className="text-sm dark-text-secondary">{selectedCategory ? `Category: ${selectedCategory}` : topic ? `Topic: ${topic}` : 'General quiz'} • Difficulty: {difficulty}</div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm dark-text-muted">Score</div>
                      <div className="text-2xl font-bold dark-text">{correctCount} / {total}</div>
                    </div>
                    <div>
                      <div className="text-sm dark-text-muted">Accuracy</div>
                      <div className="text-2xl font-bold dark-text">{accuracy}%</div>
                    </div>
                    <div>
                      <div className="text-sm dark-text-muted">Time</div>
                      <div className="text-2xl font-bold dark-text">{elapsedSec}s</div>
                    </div>
                    <div>
                      <div className="text-sm dark-text-muted">Speed</div>
                      <div className="text-2xl font-bold dark-text">{speed} qpm</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 shadow-sm">
                  <ChartContainer config={chartConfig as any} className="aspect-[4/3]">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="label" innerRadius={40} outerRadius={70} paddingAngle={3}>
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold dark-text">AI Summary</div>
                    <Button size="sm" variant="outline" onClick={() => setRegen((n) => n + 1)} className="dark-button focus-ring">Regenerate</Button>
                  </div>
                  {aiLoading && <div className="text-sm dark-text-muted">Generating insights…</div>}
                  {aiError && <div className="text-sm text-red-600 dark:text-red-400">{aiError}</div>}
                  {!aiLoading && !aiError && aiSummary && (
                    <div className="space-y-4">
                      <div className="text-sm leading-relaxed dark-text-secondary">{aiSummary.summary}</div>
                      {aiSummary.strengths?.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1 dark-text">Strengths</div>
                          <ul className="list-disc pl-5 text-sm space-y-1 dark-text-secondary">
                            {aiSummary.strengths.map((s, i) => (<li key={i}>{s}</li>))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.weaknesses?.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1 dark-text">Areas to Improve</div>
                          <ul className="list-disc pl-5 text-sm space-y-1 dark-text-secondary">
                            {aiSummary.weaknesses.map((s, i) => (<li key={i}>{s}</li>))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.suggestions?.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1 dark-text">Suggestions</div>
                          <ul className="list-disc pl-5 text-sm space-y-1 dark-text-secondary">
                            {aiSummary.suggestions.map((s, i) => (<li key={i}>{s}</li>))}
                          </ul>
                        </div>
                      )}
                      {aiSummary.recommendedTopics?.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1 dark-text">Recommended Topics</div>
                          <div className="flex flex-wrap gap-2">
                            {aiSummary.recommendedTopics.map((t, i) => (
                              <span key={i} className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 dark-text-secondary">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!aiLoading && !aiError && !aiSummary && (
                    <div className="text-sm dark-text-muted">No AI insights available.</div>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="font-semibold dark-text">Review Incorrect Answers</div>
                  {wrongItems.length === 0 ? (
                    <div className="text-sm dark-text-muted">Great! You answered everything correctly.</div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-auto pr-1">
                      {wrongItems.map((w) => (
                        <div key={w.id} className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-700/50">
                          <div className="text-sm font-medium mb-1 dark-text">{w.question}</div>
                          <div className="text-xs dark-text-secondary">Your answer: <span className="text-red-600 dark:text-red-400 font-medium">{w.selected || '—'}</span></div>
                          <div className="text-xs dark-text-secondary">Correct: <span className="text-green-600 dark:text-green-400 font-medium">{w.correct}</span></div>
                          {w.explanation && (<div className="mt-1 text-xs dark-text-muted">{w.explanation}</div>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={finishAndSubmit} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg dark:shadow-blue-500/25 focus-ring">Save to Leaderboard</Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="dark-button focus-ring">Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
      <div className="container py-6 sm:py-8">
      <div className="mb-4">
        {/* Quiz progress bar (neutral theme) */}
          <Progress value={progress} className="h-3 md:h-2 overflow-hidden bg-gray-200 dark:bg-gray-800">
          {/* progress bar styled by component */}
        </Progress>
          <div className="mt-2 text-sm sm:text-base dark-text-secondary">Question {index + 1} of {questions.length}</div>
        {mode === 'timed' && (
          <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            {/* Animated circular timer */}
            <div className="relative h-9 w-9">
              <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                <defs>
                  <radialGradient id="timerGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </radialGradient>
                </defs>
                <path
                  d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  className="dark:stroke-gray-700"
                />
                <path
                  d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(0.001, timeFraction) * 100}, 100`}
                  style={{ transition: 'stroke-dasharray 300ms ease' }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold select-none dark-text">
                {remainingSec}s
              </div>
            </div>

            {/* Animated progress bar reflecting remaining time */}
            {/* Timer progress (distinct warm theme) */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
                style={{ width: `${timePercent}%`, transition: 'width 300ms ease' }}
              />
              {/* shine */}
              <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-white/20 blur-[2px]" />
              </div>
            </div>

            {/* Badge with pulse when low */}
            <div className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1 border ${
              remainingSec <= 5 
                ? 'border-red-500 text-red-600 dark:text-red-400 dark:border-red-400 animate-pulse' 
                : 'border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300'
            }`}>
              <Hourglass className="w-3 h-3" />
              {remainingSec <= 5 ? 'Hurry up!' : 'Timing'}
            </div>
          </div>
        )}
        {selectedCategory && (
          <div className="mt-2">
            <Badge variant="secondary" className="dark:bg-gray-800 dark:text-gray-300">Category: {selectedCategory}</Badge>
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
          <Card className="max-w-3xl mx-auto glass-light shadow-dark">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl leading-snug dark-text">{current.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {current.image_url && (
                <img src={current.image_url} alt="question" className="w-full rounded-lg shadow-md" />
              )}

              {current.type === "multiple_choice" && (
                <RadioGroup
                  value={selected[current.id] || ""}
                  onValueChange={(v) => registerAnswer(v)}
                  className="space-y-3"
                >
                  {Array.isArray(current.options) && current.options.map((opt: string, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect = String(opt) === String((current as any).correct_answer);
                    const isSelected = selected[current.id] === opt;
                    
                    return (
                      <label key={opt} className={`flex items-center gap-4 rounded-lg border p-4 sm:p-3 cursor-pointer transition-all duration-200 hover:shadow-md focus-ring ${
                        isAnswered 
                          ? isCorrect 
                            ? 'border-green-500 bg-green-50/60 dark:bg-green-950/30 dark:border-green-400 shadow-md' 
                            : isSelected 
                              ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 dark:border-red-400 shadow-md' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                        <RadioGroupItem className="h-5 w-5" value={opt} disabled={isAnswered} />
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark-text">{letter}</span>
                        <span className="text-[15px] sm:text-base leading-snug dark-text">{opt}</span>
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
                      className={`py-3 sm:py-2 transition-all duration-200 focus-ring ${
                        selected[current.id] === opt 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md' 
                          : 'dark-button'
                      }`}
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
                  className="dark-input focus-ring"
                />
              )}

              {current.type === "image_based" && (
                <RadioGroup
                  value={selected[current.id] || ""}
                  onValueChange={(v) => registerAnswer(v)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {Array.isArray(current.options) && current.options.map((opt: any) => {
                    const isCorrect = String(opt.value) === String((current as any).correct_answer);
                    const isSelected = selected[current.id] === opt.value;
                    
                    return (
                      <label key={opt.value} className={`rounded-lg overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-md focus-ring ${
                        isAnswered 
                          ? isCorrect 
                            ? 'border-green-500 dark:border-green-400 shadow-md' 
                            : isSelected 
                              ? 'border-red-500 dark:border-red-400 shadow-md' 
                              : 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                        <img src={opt.image_url} alt={opt.label} className="h-40 w-full object-cover" />
                        <div className="p-2 bg-white dark:bg-gray-800">
                          <input aria-hidden type="radio" className="mr-2 h-4 w-4" value={opt.value} checked={selected[current.id] === opt.value} readOnly />
                          <span className="text-[15px] sm:text-base dark-text">{opt.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}

              {isAnswered && (
                <div className={`mt-4 text-sm font-medium ${
                  correctMap[current.id] 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
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


