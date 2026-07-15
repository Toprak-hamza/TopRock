"use client";

import { useState, useEffect } from "react";
import { CurriculumSubject, getCurriculum } from "@/lib/auth";
import { BookOpen, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type BoxState = 0 | 1 | 2; // 0: Gri, 1: Sarı, 2: Yeşil
type TopicState = {
  study: BoxState;
  solve: BoxState;
  review: BoxState;
};

type MatrixState = Record<string, TopicState>;

export function RemoteMatrixViewer({ studentId }: { studentId: string }) {
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [subjectsData, setSubjectsData] = useState<CurriculumSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const curr = await getCurriculum();
      setSubjectsData(curr);

      if (studentId) {
        const { data: tpData, error } = await supabase
          .from("topics_progress")
          .select("*")
          .eq("student_id", studentId);

        if (error) throw error;

        if (tpData) {
          const newMatrix: MatrixState = {};
          tpData.forEach((row) => {
            const k = `${row.subject}-${row.topic}`;
            const states = (typeof row.states === "string" ? JSON.parse(row.states) : row.states) as TopicState || { study: 0, solve: 0, review: 0 };
            newMatrix[k] = states;
          });
          setMatrix(newMatrix);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Optionally could add realtime here too to watch the student update their matrix live
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase.channel('student_matrix_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics_progress', filter: `student_id=eq.${studentId}` }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const getTopicProgressTotal = (subject: string, topic: string) => {
    const state = matrix[`${subject}-${topic}`];
    if (!state) return 0;
    return state.study + state.solve + state.review; // Max is 6
  };

  const getSubjectProgress = (subject: string, topics: string[]) => {
    if (topics.length === 0) return 0;
    let totalPoints = 0;
    const maxPoints = topics.length * 6;
    topics.forEach(t => {
      const p = getTopicProgressTotal(subject, t);
      totalPoints += p;
    });
    return Math.min(100, Math.round((totalPoints / maxPoints) * 100)) || 0;
  };

  const getBoxStyle = (val: BoxState) => {
    if (val === 1) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
    if (val === 2) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/50";
    return "bg-slate-800 text-slate-500 border-slate-700 opacity-50";
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center border border-border rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (subjectsData.length === 0) return (
    <div className="text-center p-8 border border-border rounded-xl text-muted-foreground text-sm">
      Sistemde kayıtlı müfredat bulunmuyor.
    </div>
  );

  return (
    <div className="space-y-6">
      {subjectsData.map(subjectObj => {
        const pct = getSubjectProgress(subjectObj.name, subjectObj.topics);

        return (
          <section key={subjectObj.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Subject Header & Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-accent" />
                <h3 className="text-lg font-semibold text-card-foreground tracking-tight">{subjectObj.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">% {pct}</span>
                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Topics Grid Table - READ ONLY */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap hidden sm:table">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-medium w-1/2">Konu Başlığı</th>
                      <th className="px-4 py-3 font-medium text-center">Çalışıldı</th>
                      <th className="px-4 py-3 font-medium text-center">Çözüldü</th>
                      <th className="px-4 py-3 font-medium text-center">Tekrar Edildi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subjectObj.topics.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-muted-foreground italic">Bu derste henüz konu yok.</td></tr>
                    )}
                    {subjectObj.topics.map(topic => {
                      const topicState = matrix[`${subjectObj.name}-${topic}`] || { study: 0, solve: 0, review: 0 };

                      return (
                        <tr key={topic} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-card-foreground border-r border-border/50">
                            {topic}
                          </td>
                          <td className="px-4 py-3 text-center border-r border-border/50">
                            <div className={`inline-flex size-5 items-center justify-center rounded border mx-auto transition-colors ${getBoxStyle(topicState.study)}`}>
                              {topicState.study === 2 && <CheckCircle2 className="size-3" />}
                              {topicState.study === 1 && <CircleDashed className="size-3" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center border-r border-border/50">
                            <div className={`inline-flex size-5 items-center justify-center rounded border mx-auto transition-colors ${getBoxStyle(topicState.solve)}`}>
                              {topicState.solve === 2 && <CheckCircle2 className="size-3" />}
                              {topicState.solve === 1 && <CircleDashed className="size-3" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`inline-flex size-5 items-center justify-center rounded border mx-auto transition-colors ${getBoxStyle(topicState.review)}`}>
                              {topicState.review === 2 && <CheckCircle2 className="size-3" />}
                              {topicState.review === 1 && <CircleDashed className="size-3" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile View Placeholder since complex tables shrink badly */}
                <div className="sm:hidden p-4 text-center text-muted-foreground text-xs italic">
                  Detaylı matrisi görmek için cihazınızı yan çevirin.
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
