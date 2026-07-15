"use client";

import { useEffect, useState } from "react";
import { CheckSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getHomeworks } from "@/lib/auth";
import { cn } from "@/lib/utils";

function ProgressBar({
  value,
  max,
  barClassName,
  trackClassName,
}: {
  value: number;
  max: number;
  barClassName: string;
  trackClassName?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full",
        trackClassName ?? "bg-muted",
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function HomeworkProgressCard() {
  const { user } = useAuth();
  const [hwSuccessPct, setHwSuccessPct] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const allHWs = await getHomeworks();
        const studentHws = allHWs.filter(h => h.studentId === user.id && h.completed && h.correctCount !== undefined);
        if (studentHws.length > 0) {
          let totalC = 0, totalI = 0, totalE = 0;
          studentHws.forEach(h => {
            totalC += h.correctCount || 0;
            totalI += h.incorrectCount || 0;
            totalE += h.emptyCount || 0;
          });
          const total = totalC + totalI + totalE;
          if (total > 0) {
            setHwSuccessPct(Math.round((totalC / total) * 100));
          } else {
            setHwSuccessPct(null);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchStats();
  }, [user]);

  const isLow = hwSuccessPct !== null && hwSuccessPct < 50;

  return (
    <article className={`rounded-xl border p-6 shadow-sm ${isLow ? 'border-orange-500/50 bg-orange-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <CheckSquare className={`size-5 ${isLow ? 'text-orange-500' : 'text-primary'}`} aria-hidden />
        <h2 className={`text-sm font-semibold ${isLow ? 'text-orange-600 dark:text-orange-400' : 'text-card-foreground'}`}>
          Ödev Başarı Oranı
        </h2>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight ${isLow ? 'text-orange-600 dark:text-orange-400' : 'text-card-foreground'}`}>
        {hwSuccessPct !== null ? `%${hwSuccessPct}` : "--"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Kümülatif Başarı (D/Y/B)</p>
      <div className="mt-4">
        <ProgressBar
          value={hwSuccessPct || 0}
          max={100}
          barClassName={isLow ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-primary to-blue-500"}
        />
      </div>
    </article>
  );
}
