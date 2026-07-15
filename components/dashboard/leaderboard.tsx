"use client";

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/auth";
import { Trophy, Medal, Crown, Loader2, Sparkles, Award } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard();
        setLeaderboard(data);
      } catch (e) {
        console.error("Error loading leaderboard:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-card rounded-xl border border-border">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Liderlik Tablosu yükleniyor...</span>
      </div>
    );
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center size-8 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
            <Crown className="size-5" />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center size-8 rounded-full bg-slate-400/20 text-slate-400 border border-slate-400/30">
            <Trophy className="size-4" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center size-8 rounded-full bg-amber-700/20 text-amber-700 border border-amber-700/30">
            <Medal className="size-4" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center size-8 rounded-full bg-muted text-muted-foreground text-xs font-bold font-mono">
            {index + 1}
          </div>
        );
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-lg overflow-hidden flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          <h2 className="text-lg font-bold tracking-tight text-card-foreground">
            Liderlik Tablosu
          </h2>
        </div>
        <Sparkles className="size-4 text-amber-400 animate-spin-slow" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[420px] pr-1 scrollbar-thin">
        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-55">
            <Award className="size-10 mb-2" />
            <p className="text-sm">Henüz veri bulunmamaktadır.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((student, index) => {
              const isTop3 = index < 3;
              return (
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={student.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    index === 0 && "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30 shadow-sm shadow-amber-500/5",
                    index === 1 && "bg-gradient-to-r from-slate-400/10 to-slate-400/5 border-slate-400/20",
                    index === 2 && "bg-gradient-to-r from-amber-700/10 to-amber-700/5 border-amber-700/20",
                    !isTop3 && "bg-muted/10 border-border/60 hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getRankBadge(index)}
                    <div>
                      <p className={cn("text-sm font-semibold", isTop3 ? "text-foreground" : "text-muted-foreground")}>
                        {student.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Level {student.level}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-sm font-black tracking-tight",
                      index === 0 && "text-amber-500",
                      index === 1 && "text-slate-400",
                      index === 2 && "text-amber-700",
                      !isTop3 && "text-muted-foreground"
                    )}>
                      {student.xp} <span className="text-[10px] font-normal uppercase">XP</span>
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
