"use client";

import { useEffect, useState } from "react";
import { getBadges, getStudentBadges, Badge } from "@/lib/auth";
import { Zap, CheckCircle, Target, Flag, Flame, Award, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Map string representation of icon names to Lucide Icon Components
const iconMap: Record<string, any> = {
  Zap,
  CheckCircle,
  Target,
  Flag,
  Flame,
  Award
};

export function StudentBadgesCard({ studentId }: { studentId: string }) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [badgesList, earnedList] = await Promise.all([
          getBadges(),
          getStudentBadges(studentId)
        ]);
        setAllBadges(badgesList);
        setEarnedBadges(earnedList);
      } catch (e) {
        console.error("Error loading badges:", e);
      } finally {
        setIsLoading(false);
      }
    }
    if (studentId) load();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="h-44 bg-card rounded-xl border border-border animate-pulse" />
    );
  }

  const isEarned = (badgeId: string) => {
    return earnedBadges.some(b => b.id === badgeId);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-md overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
        <Award className="size-5 text-emerald-500" />
        <h2 className="text-lg font-bold tracking-tight text-card-foreground">
          Kazandığın Rozetler
        </h2>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {earnedBadges.length} / {allBadges.length}
        </span>
      </div>

      {allBadges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-55">
          <Sparkles className="size-8 mb-2" />
          <p className="text-sm">Henüz rozet eklenmedi.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {allBadges.map((badge, idx) => {
            const earned = isEarned(badge.id);
            const IconComponent = iconMap[badge.iconName] || Award;
            
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={badge.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all relative overflow-hidden group",
                  earned 
                    ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-foreground shadow-sm shadow-emerald-500/5" 
                    : "border-border/60 bg-muted/5 opacity-55"
                )}
              >
                {/* Parıltı Efekti */}
                {earned && (
                  <div className="absolute -right-8 -top-8 size-16 rounded-full bg-emerald-500/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                )}

                <div className={cn(
                  "flex size-10 items-center justify-center rounded-xl ring-1 shadow-sm shrink-0",
                  earned
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white ring-emerald-500/30 shadow-emerald-500/20"
                    : "bg-muted text-muted-foreground ring-border"
                )}>
                  <IconComponent className="size-5" />
                </div>
                <div>
                  <h3 className={cn("text-xs font-bold", earned ? "text-foreground" : "text-muted-foreground")}>
                    {badge.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {badge.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
