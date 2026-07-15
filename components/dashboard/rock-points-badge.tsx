"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { getHomeworks } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function RockPointsBadge() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);

  const calculatePoints = async () => {
    if (!user) return;
    try {
      const allHWs = await getHomeworks() || [];
      const studentHWs = allHWs.filter(h => h.studentId === user.id && h.completed);
      setPoints(studentHWs.length * 10);
    } catch (e) {
      console.error(e);
      setPoints(0);
    }
  };

  useEffect(() => {
    calculatePoints();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime listener for homework completion -> Points update!
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('rock_points_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homeworks', filter: `student_id=eq.${user.id}` }, () => {
        calculatePoints();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5",
        "text-sm font-semibold tabular-nums text-amber-200 shadow-sm ring-1 ring-amber-400/20",
        "dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100",
      )}
      title="RockPoints — tamamlanan ödevlerle kazanılır"
    >
      <Star
        className="size-4 shrink-0 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.55)]"
        aria-hidden
      />
      <span className="text-amber-950 dark:text-amber-50">{points}</span>
      <span className="hidden text-xs font-medium text-amber-800/80 sm:inline dark:text-amber-200/80">
        RP
      </span>
    </div>
  );
}
