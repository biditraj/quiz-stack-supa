import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard", 50], queryFn: () => api.getLeaderboard(50), refetchInterval: 5000 });
  const rows = (data as any)?.data ?? [];

  return (
    <div className="container py-10">
      <Card className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-white/40 dark:divide-white/10">
              {rows.map((row: any, idx: number) => (
                <motion.li
                  key={row.user_id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center text-xs font-semibold">
                      {idx + 1}
                    </div>
                    <span className="font-medium">{row.username}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-6">
                    <span>{row.total_score} pts</span>
                    <span>{Math.round(row.avg_accuracy)}% acc</span>
                    <span>{Math.round(row.avg_speed)} qpm</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


