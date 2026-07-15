"use client";

import { useEffect, useState } from "react";
import { 
  CheckSquare, 
  Square, 
  Loader2, 
  Target, 
  Clock, 
  CalendarDays,
  Sparkles,
  Trophy,
  Book,
  Layers,
  FileText,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  WeeklyProgram, 
  DailyTask, 
  getWeeklyProgram, 
  getDailyTasks, 
  updateTaskCompletion 
} from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

const DAYS_OF_WEEK_LABELS = [
  "",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar"
];

export function GununGorevleri() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [programId, setProgramId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Helper: Get Monday of the current week
  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  // Format date to YYYY-MM-DD
  function formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const loadTodayTasks = async () => {
    if (!user || user.role !== "student") return;
    try {
      const today = new Date();
      const currentDay = today.getDay() === 0 ? 7 : today.getDay();
      setDayOfWeek(currentDay);

      const monday = getMonday(today);
      const weekStr = formatDate(monday);
      
      // Get weekly program (query only, do not insert to respect RLS)
      const prog = await getWeeklyProgram(user.id, weekStr);
      if (prog) {
        setProgramId(prog.id);
        const allTasks = await getDailyTasks(prog.id);
        // Filter for today only
        const todayTasks = allTasks.filter(t => t.dayOfWeek === currentDay);
        setTasks(todayTasks);
      } else {
        setProgramId(null);
        setTasks([]);
      }
    } catch (e) {
      console.error("Error loading today tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadTodayTasks();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Realtime updates for tasks
  useEffect(() => {
    if (!programId) return;

    const channel = supabase.channel('daily_tasks_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'daily_tasks', 
        filter: `program_id=eq.${programId}` 
      }, () => {
        loadTodayTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [programId]);

  const handleToggleTask = async (task: DailyTask) => {
    const newStatus = !task.isCompleted;

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t));

    try {
      await updateTaskCompletion(task.id, newStatus);

      // Celebrate task completion with confetti!
      if (newStatus) {
        import("canvas-confetti").then(mod => {
          const confetti = mod.default || mod;
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.7 }
          });
        }).catch(err => console.error("Confetti loading error:", err));
      }
    } catch (e) {
      console.error("Error updating task completion:", e);
      // Revert Optimistic UI
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !newStatus } : t));
    }
  };

  const getSubjectColorClass = (sub: string) => {
    switch (sub) {
      case "Matematik":
      case "Geometri":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Fizik":
      case "Kimya":
      case "Biyoloji":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Türkçe":
      case "Edebiyat":
      case "Paragraf":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Tarih":
      case "Coğrafya":
      case "Felsefe":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const totalCount = tasks.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col min-h-[250px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Bugünün Programı & Görevleri</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Koçunuzun bugün ({DAYS_OF_WEEK_LABELS[dayOfWeek]}) için hazırladığı program hedefleri.
            </p>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{completedCount} / {totalCount} Görev</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{completionPct}%</span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="mt-4 flex-1 space-y-3">
        {loading || authLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Görevler yükleniyor...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-55 text-center">
            <Sparkles className="size-8 mb-2 text-primary" />
            <p className="text-sm font-semibold">Harika! Bugün için atanmış bir ders görevin bulunmuyor.</p>
            <p className="text-xs text-muted-foreground mt-1">Pomodoro sayacı ile kendi odağını yaratabilirsin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {tasks.map(task => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={task.id}
                  onClick={() => {
                    const hasDetails = !!(task.subTopic || task.sourceBook || task.pageRange || task.coachNote);
                    if (hasDetails) {
                      setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                    }
                  }}
                  className={cn(
                    "flex flex-col rounded-xl border p-4 transition-all",
                    task.isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/5 opacity-75"
                      : "border-border/80 bg-muted/20",
                    (task.subTopic || task.sourceBook || task.pageRange || task.coachNote)
                      ? "cursor-pointer hover:border-primary/40 select-none"
                      : ""
                  )}
                >
                  <div className="flex items-start gap-4 w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task);
                      }}
                      className={cn(
                        "mt-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-90 shrink-0",
                        task.isCompleted ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {task.isCompleted ? <CheckSquare className="size-5" /> : <Square className="size-5" />}
                    </button>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded border tracking-wide",
                          getSubjectColorClass(task.subject)
                        )}>
                          {task.subject}
                        </span>
                        {!!(task.subTopic || task.sourceBook || task.pageRange || task.coachNote) && (
                          <span className="text-[10px] font-bold text-primary animate-pulse bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {expandedTaskId === task.id ? "Detayları Gizle ▲" : "Detayları Gör ▼"}
                          </span>
                        )}
                      </div>

                      <p className={cn(
                        "text-sm leading-relaxed font-semibold transition-all break-words",
                        task.isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {task.description}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs font-bold text-muted-foreground pt-1.5 border-t border-border/30">
                        {task.targetQuestions > 0 && (
                          <span className="flex items-center gap-1">
                            <Target className="size-3.5 text-red-500" /> Hedef: {task.targetQuestions} Soru
                          </span>
                        )}
                        {task.targetDuration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-amber-500" /> Süre: {task.targetDuration} Pomodoro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedTaskId === task.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border/40 space-y-3 text-xs w-full"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-muted-foreground font-semibold">
                        {task.subTopic && (
                          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                            <Layers className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">Alt Konu: <strong className="text-foreground">{task.subTopic}</strong></span>
                          </div>
                        )}
                        {task.sourceBook && (
                          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                            <Book className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">Kaynak Kitap: <strong className="text-foreground">{task.sourceBook}</strong></span>
                          </div>
                        )}
                        {task.pageRange && (
                          <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                            <FileText className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">Sayfa Aralığı: <strong className="text-foreground">{task.pageRange}</strong></span>
                          </div>
                        )}
                      </div>

                      {task.coachNote && (
                        <div className="p-3 rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-purple-500/5 to-primary/5 dark:from-amber-500/10 dark:via-purple-500/10 dark:to-primary/10 flex items-start gap-2.5 shadow-inner">
                          <MessageSquare className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Koçun Notu</span>
                            <p className="text-xs italic text-foreground/90 mt-1 font-semibold leading-relaxed">
                              &ldquo;{task.coachNote}&rdquo;
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* All Completed Celebration */}
            {completionPct === 100 && totalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl"
              >
                <Trophy className="size-5 shrink-0 animate-bounce" />
                <span className="text-xs font-bold">Tebrikler! Bugünün programındaki tüm görevleri başarıyla tamamladın! 🏆</span>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
