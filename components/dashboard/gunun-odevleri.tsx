"use client";

import { useEffect, useState } from "react";
import { BookPlus, ListChecks, Calendar, CheckSquare, Square, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Homework, getHomeworks, updateHomeworkStatus, updateHomeworkAnalysis } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export function GununOdevleri() {
  const { user, isLoading: authLoading } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!user || user.role !== "student") return;
    try {
      const allHWs = await getHomeworks();
      setHomeworks(allHWs.filter(h => h.studentId === user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('homework_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homeworks', filter: `student_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const [activeAnalysisHw, setActiveAnalysisHw] = useState<Homework | null>(null);
  const [correctCount, setCorrectCount] = useState<number | "">("");
  const [incorrectCount, setIncorrectCount] = useState<number | "">("");
  const [emptyCount, setEmptyCount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTask = async (hw: Homework) => {
    if (hw.completed) {
      // Revert optimism
      setHomeworks(prev => prev.map(h => h.id === hw.id ? { ...h, completed: false } : h));
      await updateHomeworkStatus(hw.id, false);
    } else {
      // Open Modal
      setActiveAnalysisHw(hw);
      setCorrectCount(0);
      setIncorrectCount(0);
      setEmptyCount(0);
    }
  };

  const submitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnalysisHw) return;
    setIsSubmitting(true);

    const c = typeof correctCount === 'number' ? correctCount : 0;
    const i = typeof incorrectCount === 'number' ? incorrectCount : 0;
    const em = typeof emptyCount === 'number' ? emptyCount : 0;

    setHomeworks(prev => prev.map(h => h.id === activeAnalysisHw.id ? {
      ...h,
      completed: true,
      correctCount: c,
      incorrectCount: i,
      emptyCount: em
    } : h));

    await updateHomeworkAnalysis(activeAnalysisHw.id, c, i, em);

    const total = c + i + em;
    const isChampion = total > 0 && (c / total) >= 0.9;

    if (isChampion) {
      import("canvas-confetti").then(mod => {
        const confetti = mod.default || mod;
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }).catch(err => console.error("Confetti error", err));
    }

    setIsSubmitting(false);
    setActiveAnalysisHw(null);
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "text-red-500 border-red-500/30 bg-red-500/10";
      case "medium": return "text-orange-500 border-orange-500/30 bg-orange-500/10";
      case "low": return "text-green-500 border-green-500/30 bg-green-500/10";
      default: return "";
    }
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden flex flex-col max-h-[600px] min-h-[300px]">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-accent" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
            Sana Atanan Ödevler
          </h2>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3">
        {isLoading || authLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Ödevler yükleniyor...</span>
          </div>
        ) : homeworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50 text-center">
            <BookPlus className="size-8 mb-2" />
            <p className="text-sm">Henüz sistemde sana atanmış bir ödev bulunmamaktadır.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {homeworks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(hw => (
                <motion.li
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  key={hw.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 transition-colors relative overflow-hidden",
                    hw.completed 
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-80" 
                      : "border-border/80 bg-muted/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(hw)}
                      className={cn(
                        "mt-0.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        hw.completed ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {hw.completed ? <CheckSquare className="size-5" /> : <Square className="size-5" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-sm font-semibold leading-relaxed transition-all",
                            hw.completed ? "text-muted-foreground line-through" : "text-card-foreground"
                          )}
                        >
                          {hw.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(hw.priority)}`}>
                          {hw.priority === 'high' ? 'Yüksek' : hw.priority === 'medium' ? 'Orta' : 'Düşük'}
                        </span>
                      </div>
                      
                      <p className={cn(
                        "text-xs leading-relaxed transition-all",
                        hw.completed ? "text-muted-foreground/60 line-through" : "text-muted-foreground"
                      )}>
                        {hw.description}
                      </p>
                      
                      {!hw.completed && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-muted-foreground opacity-80">
                          <Calendar className="size-3.5" /> Son Teslim: {new Date(hw.dueDate).toLocaleDateString("tr-TR")}
                        </div>
                      )}
                      
                      {hw.questionCount && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-accent">
                          👉 Hedef: {hw.questionCount} Soru
                        </div>
                      )}
                      
                      {hw.completed && hw.correctCount !== undefined && hw.incorrectCount !== undefined && hw.emptyCount !== undefined && (
                        <div className="flex gap-2 mt-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-card text-foreground border border-border shadow-sm">
                            {hw.correctCount}D / {hw.incorrectCount}Y / {hw.emptyCount}B
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>

    {/* Completion Modal */}
    <AnimatePresence>
      {activeAnalysisHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setActiveAnalysisHw(null)}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground pr-8">Analiz ve Tamamlama</h3>
            
            {activeAnalysisHw.questionCount && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent font-semibold text-xs animate-in fade-in zoom-in">
                👉 Hedef: {activeAnalysisHw.questionCount} Soru
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-2 mb-6 line-clamp-2">
              &quot;{activeAnalysisHw.subject}&quot; konusu için sonuçlarını gir:
            </p>

            <form onSubmit={submitAnalysis} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 focus-within:text-green-500 text-muted-foreground transition-colors">
                  <label className="text-xs font-bold uppercase tracking-wider pl-1">Doğru</label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={isSubmitting}
                    value={correctCount}
                    onChange={(e) => setCorrectCount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-border/50 bg-background px-3 py-2.5 text-center text-lg font-bold text-foreground focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-red-500 text-muted-foreground transition-colors">
                  <label className="text-xs font-bold uppercase tracking-wider pl-1">Yanlış</label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={isSubmitting}
                    value={incorrectCount}
                    onChange={(e) => setIncorrectCount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-border/50 bg-background px-3 py-2.5 text-center text-lg font-bold text-foreground focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5 focus-within:text-primary text-muted-foreground transition-colors">
                  <label className="text-xs font-bold uppercase tracking-wider pl-1">Boş</label>
                  <input
                    type="number"
                    min="0"
                    required
                    disabled={isSubmitting}
                    value={emptyCount}
                    onChange={(e) => setEmptyCount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-border/50 bg-background px-3 py-2.5 text-center text-lg font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                {activeAnalysisHw.questionCount && (Number(correctCount) + Number(incorrectCount) + Number(emptyCount)) > activeAnalysisHw.questionCount && (
                  <p className="text-xs font-medium text-red-500 mb-3 text-center bg-red-500/10 border border-red-500/20 py-2 rounded-md">
                    Sayıların toplamı hedef soru sayısını ({activeAnalysisHw.questionCount}) geçemez!
                  </p>
                )}
                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    correctCount === "" || 
                    incorrectCount === "" || 
                    emptyCount === "" || 
                    (activeAnalysisHw.questionCount ? (Number(correctCount) + Number(incorrectCount) + Number(emptyCount)) > activeAnalysisHw.questionCount : false)
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <CheckSquare className="size-5" /> }
                  {isSubmitting ? "Kaydediliyor..." : "Ödevi Tamamla ve Kaydet"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
