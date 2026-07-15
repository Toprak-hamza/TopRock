"use client";

import { useState } from "react";
import { ExamDetail, updateCoachNote } from "@/lib/auth";
import { Loader2, ChevronDown, ChevronUp, FileText, CheckCircle2, MessageSquare, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function ExamArchive({ 
  exams, 
  isLoading,
  asCoach = false,
  onExamUpdated
}: { 
  exams: ExamDetail[], 
  isLoading?: boolean,
  asCoach?: boolean,
  onExamUpdated?: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [coachNoteDraft, setCoachNoteDraft] = useState<{ [key: string]: string }>({});
  const [isSavingNote, setIsSavingNote] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/20 border border-dashed border-border/50 rounded-xl text-muted-foreground text-sm">
        Henüz deneme sınavı kaydı bulunmuyor.
      </div>
    );
  }

  const toggleExpand = (id: string, currentNote: string = "") => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (asCoach && coachNoteDraft[id] === undefined) {
        setCoachNoteDraft(prev => ({ ...prev, [id]: currentNote || "" }));
      }
    }
  };

  const handleSaveNote = async (examId: string) => {
    setIsSavingNote(examId);
    try {
      await updateCoachNote(examId, coachNoteDraft[examId] || "");
      if (onExamUpdated) onExamUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingNote(null);
    }
  };

  return (
    <div className="space-y-4">
      {exams.map((exam) => {
        const isExpanded = expandedId === exam.id;
        
        return (
          <div key={exam.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all">
            {/* Header / Summary Row */}
            <div 
              onClick={() => toggleExpand(exam.id, exam.coachNote)}
              className={cn(
                "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors",
                isExpanded && "bg-muted/20 border-b border-border/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                  {exam.examType || "TYT"}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground leading-tight">{exam.title || "Deneme Sınavı"}</h3>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{new Date(exam.date).toLocaleDateString("tr-TR")}</span>
                    {exam.coachNote && !asCoach && (
                      <span className="flex items-center text-amber-600 dark:text-amber-500 font-medium">
                        <MessageSquare className="size-3 mr-1" /> Koç Notu Var
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Toplam Net</div>
                  <div className="text-xl font-bold text-foreground">
                    {exam.overallNet}
                  </div>
                </div>
                <div className="p-2 text-muted-foreground bg-background rounded-full shrink-0">
                  {isExpanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-background"
                >
                  <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Detail Table */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="size-4 text-primary" /> Ders Analizi
                      </h4>
                      <div className="rounded-lg border border-border overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[400px]">
                          <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                            <tr>
                              <th className="px-4 py-2">Ders</th>
                              <th className="px-4 py-2 text-center text-green-600">D</th>
                              <th className="px-4 py-2 text-center text-red-500">Y</th>
                              <th className="px-4 py-2 text-center text-orange-500">B</th>
                              <th className="px-4 py-2 text-right">Net</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {exam.subjectScores.map((score, i) => (
                              <tr key={i} className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-medium">{score.subject}</td>
                                <td className="px-4 py-2 text-center text-green-600">{score.correct}</td>
                                <td className="px-4 py-2 text-center text-red-500">{score.incorrect}</td>
                                <td className="px-4 py-2 text-center text-orange-500">{score.empty || 0}</td>
                                <td className="px-4 py-2 text-right font-bold text-foreground">{score.net}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Coach Note */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="size-4 text-amber-500" /> Koç Değerlendirmesi
                      </h4>
                      
                      {asCoach ? (
                        <div className="space-y-3">
                          <textarea
                            value={coachNoteDraft[exam.id] !== undefined ? coachNoteDraft[exam.id] : ""}
                            onChange={(e) => setCoachNoteDraft(prev => ({ ...prev, [exam.id]: e.target.value }))}
                            placeholder="Bu sınav için öğrenciye analiz notu bırakabilirsiniz..."
                            rows={5}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none"
                          />
                          <button
                            onClick={() => handleSaveNote(exam.id)}
                            disabled={isSavingNote === exam.id}
                            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-amber-600 disabled:opacity-50"
                          >
                            {isSavingNote === exam.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Notu Güncelle
                          </button>
                        </div>
                      ) : (
                        <div className={cn(
                          "rounded-lg p-4 text-sm leading-relaxed",
                          exam.coachNote 
                            ? "bg-amber-500/10 text-amber-900 border border-amber-500/20 dark:text-amber-200" 
                            : "bg-muted/30 border border-dashed border-border text-muted-foreground flex items-center justify-center h-[120px]"
                        )}>
                          {exam.coachNote ? (
                            <div className="whitespace-pre-wrap">{exam.coachNote}</div>
                          ) : (
                            "Koç tarafından henüz bir değerlendirme eklenmemiş."
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
