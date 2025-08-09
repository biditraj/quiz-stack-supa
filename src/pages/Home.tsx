import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { 
  Brain, 
  Trophy, 
  Users, 
  Zap, 
  ArrowRight, 
  Star,
  Cpu,
  Database,
  Code2,
  Calculator,
  Server,
  GitBranch,
  BarChart3,
  BookOpenText,
  Sparkles,
  Crown,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user } = useAuth();
  const orbitRef = useRef<HTMLDivElement | null>(null);

  // Fetch leaderboard preview
  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['leaderboard-preview'],
    queryFn: () => api.getLeaderboard(3),
  });

  // Fetch categories preview
  const { data: categories, isLoading: loadingCategories } = useQuery<{ category: string; question_count: number }[]>({
    queryKey: ['categories-preview'],
    queryFn: async () => {
      try {
        const res = await api.listCategories();
        const data = (res as any)?.data || [];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {}
      // Fallback: compute from questions table directly
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

  const features = [
    {
      icon: Brain,
      title: "Smart Questions",
      description: "AI-curated questions across multiple categories and difficulty levels"
    },
    {
      icon: Zap,
      title: "Real-time Scoring",
      description: "Instant feedback and performance tracking with detailed analytics"
    },
    {
      icon: Trophy,
      title: "Leaderboards",
      description: "Compete with others and climb the rankings based on accuracy and speed"
    },
    {
      icon: Users,
      title: "Community",
      description: "Join thousands of learners improving their knowledge every day"
    }
  ];

  // Category icon resolver based on keywords
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  useEffect(() => {
    if (!orbitRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } });
      tl.to('.orbit-dot', { rotate: 360, transformOrigin: '150px 0px', duration: 12 });
    }, orbitRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-purple-950/50" />
        
         <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="container mx-auto px-4 relative z-10"
        >
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 mb-6"
            >
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Join 10,000+ quiz enthusiasts
              </span>
            </motion.div>

             <motion.h1
              variants={itemVariants}
              className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent"
            >
              Master Your Knowledge with
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Interactive Quizzes
              </span>
            </motion.h1>

            {/* Decorative GSAP orbit animation */}
            <div ref={orbitRef} className="relative h-0">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <div className="relative h-0">
                  <span className="orbit-dot inline-block h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,.8)]" />
                </div>
              </div>
            </div>

            <motion.p
              variants={itemVariants}
              className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Test your skills with our comprehensive quiz platform. Real-time scoring, 
              detailed analytics, and competitive leaderboards await you.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {user ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg px-8">
                      <Link to="/quiz" className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Start Quiz
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild variant="outline" size="lg" className="px-8 backdrop-blur-sm">
                      <Link to="/leaderboard" className="flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        View Rankings
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg px-8">
                      <Link to="/signup" className="flex items-center gap-2">
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button asChild variant="outline" size="lg" className="px-8 backdrop-blur-sm">
                      <Link to="/login">
                        Sign In
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Categories Section */}
      <section className="py-20 relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/40 to-transparent dark:via-blue-950/20" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 via-blue-700 to-indigo-700 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
              Browse Categories
            </h2>
            <p className="text-gray-600 dark:text-gray-300">Pick a category to start a quiz</p>
          </motion.div>

          {loadingCategories ? (
            <div className="grid gap-4 max-w-5xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 max-w-5xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
              {(categories || []).map((c, idx) => {
                const cfg = resolveCategoryConfig(c.category);
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={c.category}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: Math.min(idx * 0.04, 0.25) }}
                    whileHover={{ y: -6, scale: 1.02 }}
                  >
                    <Link
                      to={`/quiz?category=${encodeURIComponent(c.category)}&start=1`}
                      className="group relative overflow-hidden rounded-xl border bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 hover:shadow-xl transition block text-left h-full"
                      aria-label={`Start a quiz in ${c.category}`}
                    >
                      <span className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-blue-500/10 dark:bg-blue-400/10 blur-xl" />
                      <div className="flex items-center gap-3 relative">
                        <div className={`shrink-0 w-11 h-11 rounded-lg bg-gradient-to-r ${cfg.gradient} grid place-items-center text-white shadow-sm`}> 
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{c.category}</div>
                          <div className="text-xs text-gray-500">
                            {c.question_count ?? 0} {Number(c.question_count) === 1 ? 'question' : 'questions'}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto text-gray-400 group-hover:translate-x-0.5 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition" />
                      </div>
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-transparent via-white/10 to-transparent" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Why Choose QuizMaster?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of interactive learning with our feature-rich platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 text-center">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mini Leaderboard Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3">
              <Crown className="w-5 h-5 text-amber-500" />
              <CardTitle>Top Players</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-2" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-4">
                  {(() => {
                    const rows = ((leaderboard as any)?.data || []) as Array<{ username: string; total_score: number; user_id: string }>;
                    if (!rows.length) {
                      return (
                        <div className="text-sm text-gray-600 dark:text-gray-300">No leaderboard data yet. Be the first to play!</div>
                      );
                    }
                    const maxScore = Math.max(...rows.map(r => Number(r.total_score || 0)));
                    return rows.map((row, idx) => {
                      const width = maxScore > 0 ? Math.max(8, (Number(row.total_score) / maxScore) * 100) : 8;
                      const color = idx === 0 ? 'from-amber-400 to-amber-600' : idx === 1 ? 'from-gray-400 to-gray-500' : 'from-orange-400 to-red-500';
                      return (
                        <motion.li
                          key={row.user_id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.05 }}
                          className="relative"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${color} text-white grid place-items-center text-xs font-semibold`}>{idx + 1}</div>
                            <span className="font-medium">{row.username}</span>
                            <span className="ml-auto text-sm text-gray-600 dark:text-gray-300">{row.total_score} pts</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200/70 dark:bg-gray-700/60 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${width}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-full bg-gradient-to-r ${color}`}
                            />
                          </div>
                        </motion.li>
                      );
                    });
                  })()}
                </ul>
              )}
              <div className="mt-8 text-right">
                <Button asChild variant="outline" className="hover:shadow-md">
                  <Link to="/leaderboard" className="inline-flex items-center gap-2">
                    See full leaderboard
                    <Award className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Test Your Knowledge?
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Join thousands of learners and start your journey today
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" variant="secondary" className="px-8">
                  <Link to="/signup" className="flex items-center gap-2">
                    Get Started Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}


