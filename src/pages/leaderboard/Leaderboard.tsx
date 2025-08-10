import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, Target, Zap, Search, Crown, Award, TrendingUp, Users } from "lucide-react";

// Types
interface LeaderboardRow {
  user_id: string;
  username: string;
  total_score: number;
  avg_accuracy?: number;
  avg_speed?: number;
}

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ 
    queryKey: ["leaderboard", 50], 
    queryFn: () => api.getLeaderboard(50), 
    refetchInterval: 5000 
  });
  const rows = useMemo<LeaderboardRow[]>(() => (data as { data?: LeaderboardRow[] } | undefined)?.data ?? [], [data]);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".lb-item",
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.03, duration: 0.25, ease: "power2.out" }
      );
    }, listRef);
    return () => ctx.revert();
  }, [rows]);

  const filtered: LeaderboardRow[] = rows.filter((r) =>
    !query || String(r.username || "").toLowerCase().includes(query.toLowerCase())
  );

  const maxScore = filtered.length ? Math.max(...filtered.map((r) => Number(r.total_score || 0))) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 mb-4 sm:mb-6"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold dark-text mb-3 sm:mb-4"
          >
            Global Leaderboard
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl dark-text-secondary max-w-2xl mx-auto"
          >
            Compete with the best and climb the rankings. Show your skills and dominate the leaderboard.
          </motion.p>
        </div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <Card className="glass-light shadow-dark border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm dark-text-muted">Total Players</p>
                  <p className="text-xl sm:text-2xl font-bold dark-text">{rows.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-light shadow-dark border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm dark-text-muted">Highest Score</p>
                  <p className="text-xl sm:text-2xl font-bold dark-text">
                    {maxScore > 0 ? maxScore : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-light shadow-dark border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm dark-text-muted">Active Today</p>
                  <p className="text-xl sm:text-2xl font-bold dark-text">
                    {rows.filter((r) => r.total_score > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="glass-light shadow-dark overflow-hidden border-0 max-w-6xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="dark-text text-lg sm:text-xl">Rankings</CardTitle>
                    <p className="text-xs sm:text-sm dark-text-muted">Real-time performance tracking</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Search by username..." 
                      value={query} 
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10 dark-input focus-ring w-full sm:w-64"
                    />
                  </div>
                  {query && (
                    <Button 
                      variant="outline" 
                      onClick={() => setQuery("")}
                      className="dark-button focus-ring"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28 sm:w-32" />
                        <Skeleton className="h-3 w-20 sm:w-24" />
                      </div>
                      <div className="hidden xs:flex gap-2">
                        <Skeleton className="h-7 w-14 sm:h-8 sm:w-16 rounded-full" />
                        <Skeleton className="h-7 w-14 sm:h-8 sm:w-16 rounded-full" />
                        <Skeleton className="h-7 w-14 sm:h-8 sm:w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold dark-text mb-2">No Results Found</h3>
                      <p className="text-sm dark-text-secondary mb-4">
                        {query ? `No users found matching "${query}"` : "No leaderboard data available"}
                      </p>
                      {query && (
                        <Button 
                          variant="outline" 
                          onClick={() => setQuery("")}
                          className="dark-button focus-ring"
                        >
                          Clear Search
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((row, idx) => {
                        const isTop3 = idx < 3;
                        const rankColors = [
                          'from-yellow-400 to-amber-500', // 1st - Gold
                          'from-gray-300 to-gray-400',    // 2nd - Silver  
                          'from-amber-600 to-orange-700', // 3rd - Bronze
                          'from-blue-500 to-indigo-600'   // 4th+ - Blue
                        ];
                        const rankColor = rankColors[Math.min(idx, 3)];
                        
                        return (
                          <motion.div
                            key={row.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            className={`lb-item group relative p-4 sm:p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                              isTop3 
                                ? 'bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-amber-200 dark:border-amber-700 shadow-md' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-4 sm:gap-6">
                              {/* Rank Badge */}
                              <div className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r ${rankColor} flex items-center justify-center shadow-lg`}>
                                {isTop3 && (
                                  <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                                )}
                                <span className="text-white font-bold text-base sm:text-lg">
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                </span>
                              </div>
                              
                              {/* User Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                                  <h3 className="text-base sm:text-xl font-bold dark-text truncate">{row.username}</h3>
                                  {isTop3 && (
                                    <span className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">
                                      Top {idx + 1} Performer
                                    </span>
                                  )}
                                </div>
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                      <Trophy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-[11px] sm:text-sm dark-text-muted">Total Score</p>
                                      <p className="text-sm sm:text-base font-semibold dark-text">{row.total_score}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                      <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                      <p className="text-[11px] sm:text-sm dark-text-muted">Accuracy</p>
                                      <p className="text-sm sm:text-base font-semibold dark-text">{Math.round((Number(row.avg_accuracy) || 0) * 100)}%</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                      <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                      <p className="text-[11px] sm:text-sm dark-text-muted">Speed</p>
                                      <p className="text-sm sm:text-base font-semibold dark-text">{Math.round(Number(row.avg_speed || 0))} q/min</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Score Display */}
                              <div className="flex-shrink-0 text-right">
                                <div className="text-xl sm:text-3xl font-bold dark-text">
                                  {row.total_score}
                                </div>
                                <div className="text-xs sm:text-sm dark-text-muted">points</div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-3 sm:mt-4 h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${Math.max(5, (Number(row.total_score) / maxScore) * 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full bg-gradient-to-r ${rankColor} rounded-full`}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}


