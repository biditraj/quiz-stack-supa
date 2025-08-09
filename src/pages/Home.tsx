import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  Trophy, 
  Users, 
  Zap, 
  ArrowRight, 
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
      const res = await api.listCategories();
      return (res as any)?.data || [];
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
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-2">Browse Categories</h2>
            <p className="text-gray-600 dark:text-gray-300">Pick a category to start a quiz</p>
          </motion.div>

          {loadingCategories ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {(categories || []).map((c) => (
                <Link
                  key={c.category}
                  to={`/quiz?category=${encodeURIComponent(c.category)}&start=1`}
                  className="rounded-xl border bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-4 py-5 hover:shadow-md transition block text-left"
                >
                  <div className="text-sm font-medium">{c.category}</div>
                  <div className="text-xs text-gray-500">{c.question_count ?? 0} questions</div>
                </Link>
              ))}
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
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle>Top Players</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {(leaderboard as any)?.data?.length ? (
                    (leaderboard as any).data.map((row: any, idx: number) => (
                      <motion.li
                        key={row.user_id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center text-xs font-semibold">
                            {idx + 1}
                          </div>
                          <span className="font-medium">{row.username}</span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{row.total_score} pts</span>
                      </motion.li>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-300">No leaderboard data yet. Be the first to play!</div>
                  )}
                </ul>
              )}
              <div className="mt-6 text-right">
                <Button asChild variant="outline">
                  <Link to="/leaderboard">See full leaderboard</Link>
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


