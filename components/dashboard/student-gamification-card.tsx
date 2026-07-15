"use client";

import { useEffect, useState } from "react";
import { getStudentGamification, StudentGamification } from "@/lib/auth";
import { Sparkles, Trophy, Zap, Star } from "lucide-react";
import { motion } from "framer-motion";

export function StudentGamificationCard({ studentId }: { studentId: string }) {
  const [gam, setGam] = useState<StudentGamification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getStudentGamification(studentId);
        setGam(data);
      } catch (e) {
        console.error("Error loading student gamification:", e);
      } finally {
        setIsLoading(false);
      }
    }
    if (studentId) load();
  }, [studentId]);

  if (isLoading || !gam) {
    return (
      <div className="h-44 bg-card rounded-xl border border-border animate-pulse" />
    );
  }

  const xp = gam.totalXp;
  const level = gam.currentLevel;
  const xpInCurrentLevel = xp % 1000;
  const xpNeededForNextLevel = 1000;
  const pct = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
  const remainingXp = xpNeededForNextLevel - xpInCurrentLevel;

  return (
    <motion.article 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-950/20 p-6 shadow-md"
    >
      {/* Background Glow */}
      <div className="absolute -right-8 -top-8 size-36 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 size-36 rounded-full bg-emerald-600/5 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20">
            <Trophy className="size-7" />
            <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold ring-2 ring-background">
              <Zap className="size-3 text-white fill-current" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">
                Seviye & Gelişim
              </span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <Star className="size-2.5 fill-current" /> Seviye Atla
              </span>
            </div>
            <h2 className="text-2xl font-black text-foreground mt-0.5 flex items-baseline gap-2">
              Seviye {level}
              <span className="text-sm font-semibold text-muted-foreground">
                ({xp} Toplam XP)
              </span>
            </h2>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground font-semibold">
            Sonraki Seviye için
          </p>
          <p className="text-lg font-black text-violet-600 dark:text-violet-400">
            {remainingXp} XP <span className="text-xs font-medium text-muted-foreground">gerekli</span>
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs font-bold text-muted-foreground">
          <span>{xpInCurrentLevel} / 1000 XP</span>
          <span>%{pct}</span>
        </div>
        
        {/* Animated Progress Bar */}
        <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted border border-border/40 shadow-inner relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500 shadow-md shadow-violet-500/20"
          />
          {/* Parıltı Efekti */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground italic">
        <Sparkles className="size-3 text-amber-500" />
        <span>Her ödev tamamlandığında 50 XP, her Pomodoro seansında ise 20 XP kazanırsın!</span>
      </div>
    </motion.article>
  );
}
