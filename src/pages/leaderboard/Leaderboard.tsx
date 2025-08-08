import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard", 50], queryFn: () => api.getLeaderboard(50), refetchInterval: 5000 });
  const rows = (data as any)?.data ?? [];
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

  const filtered = rows.filter((r: any) =>
    !query || String(r.username || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="container py-10">
      <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-white/40 dark:border-white/10">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input placeholder="Search username" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button variant="outline" onClick={() => setQuery("")}>Clear</Button>
          </div>
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
            <ul ref={listRef} className="divide-y divide-white/40 dark:divide-white/10">
              {filtered.map((row: any, idx: number) => (
                <motion.li
                  key={row.user_id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="lb-item flex items-center justify-between py-3 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
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
              {!filtered.length && (
                <div className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">No results.</div>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


