"use client";

import { useState, useEffect } from "react";
import { Grid3x3, CheckCircle2, CircleDashed, Filter, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { CurriculumSubject, getCurriculum } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type BoxState = 0 | 1 | 2; // 0: Gri, 1: Sarı, 2: Yeşil
type TopicState = {
  study: BoxState;
  solve: BoxState;
  review: BoxState;
};
type MatrixState = Record<string, TopicState>;

export default function TopicsPage() {
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("Tümü"); 
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);

  const { user, isLoading: authLoading } = useAuth();
  const [subjectsData, setSubjectsData] = useState<CurriculumSubject[]>([]);

  const loadData = async () => {
    try {
      const curr = await getCurriculum();
      setSubjectsData(curr);

      if (user?.id) {
        // Fetch specific Matrix topics_progress
        const { data: tpData, error } = await supabase
          .from("topics_progress")
          .select("*")
          .eq("student_id", user.id);
        
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
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Optionally add realtime here, but usually students edit their own matrix

  const handleBoxClick = async (subject: string, topic: string, boxType: keyof TopicState) => {
    if (!user) return;

    setMatrix(prev => {
      const key = `${subject}-${topic}`;
      const currentTopicState = prev[key] || { study: 0, solve: 0, review: 0 };
      const currentBoxVal = currentTopicState[boxType];
      const nextVal = ((currentBoxVal + 1) % 3) as BoxState;
      
      const newState = {
        ...prev,
        [key]: {
          ...currentTopicState,
          [boxType]: nextVal,
        }
      };

      // Background persistence sync
      const persistState = async () => {
         try {
           const { error } = await supabase.from('topics_progress').upsert({
             student_id: user.id,
             subject: subject,
             topic: topic,
             states: newState[key],
             updated_at: new Date().toISOString()
           }, { onConflict: 'student_id,subject,topic' });

           if (error) {
             console.error("Matrix save error details:", error.message, error.details, error.hint, error.code);
           }
         } catch (e) {
            console.error("Matrix persist exception:", e);
         }
      };
      
      persistState();
      return newState;
    });
  };

  const getTopicProgressTotal = (subject: string, topic: string) => {
    const state = matrix[`${subject}-${topic}`];
    if (!state) return 0;
    return state.study + state.solve + state.review; // Max is 6
  };

  const getSubjectProgress = (subject: string, topics: string[]) => {
    let totalPoints = 0;
    const maxPoints = topics.length * 6;
    topics.forEach(t => {
       const p = getTopicProgressTotal(subject, t);
       totalPoints += p;
    });
    return Math.min(100, Math.round((totalPoints / maxPoints) * 100)) || 0;
  };

  const getBoxStyle = (val: BoxState) => {
    if (val === 1) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30";
    if (val === 2) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/30";
    return "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-800/80 hover:border-slate-500";
  };

  if (isLoading || authLoading) {
    return (
      <DashboardShell activePath="/dashboard/topics" title="Konu Matrisi" subtitle="Yükleniyor...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  // Filtreleme mantığı
  let filteredSubjects = subjectsData;
  if (activeFilter !== "Tümü") {
    filteredSubjects = filteredSubjects.filter(s => s.name === activeFilter);
  }

  // Eksikleri Göster Mantığı
  const renderedData = filteredSubjects.map(sub => {
    if (!showOnlyMissing) return sub;
    const missingTopics = sub.topics.filter(t => getTopicProgressTotal(sub.name, t) < 6);
    return { ...sub, topics: missingTopics };
  }).filter(sub => sub.topics.length > 0);

  return (
    <DashboardShell
      activePath="/dashboard/topics"
      title="Konu Matrisi"
      subtitle="Tüm müfredattaki eksiklerini tek bir sayfadan gör, adım adım erit."
    >
      <main className="space-y-8 px-4 md:px-8 py-8 pb-12 mx-auto max-w-6xl">
        
        {/* Top Controls: Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="size-4 text-muted-foreground mr-2" />
            <button 
              onClick={() => setActiveFilter("Tümü")}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent", activeFilter === "Tümü" ? "bg-accent/20 text-accent border-accent/20" : "hover:bg-accent/10 text-muted-foreground")}
            >
              Tümü
            </button>
            {subjectsData.map(sub => (
              <button 
                key={sub.id}
                onClick={() => setActiveFilter(sub.name)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent", activeFilter === sub.name ? "bg-accent/20 text-accent border-accent/20" : "hover:bg-accent/10 text-muted-foreground")}
              >
                {sub.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowOnlyMissing(!showOnlyMissing)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              showOnlyMissing 
                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" 
                : "bg-transparent text-muted-foreground border-border hover:bg-slate-800"
            )}
          >
            {showOnlyMissing ? <CheckCircle2 className="size-4" /> : <CircleDashed className="size-4" />}
            Sadece Eksikleri Göster
          </button>
        </div>

        {/* Subjects List */}
        <div className="space-y-10">
          {renderedData.map(subjectObj => {
            const pct = getSubjectProgress(subjectObj.name, subjectsData.find(s => s.id === subjectObj.id)?.topics || []);
            
            return (
              <section key={subjectObj.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Subject Header & Progress */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-5 text-accent" />
                    <h2 className="text-xl font-bold text-card-foreground tracking-tight">{subjectObj.name}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">% {pct}</span>
                    <div className="h-2 w-32 md:w-48 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all rounded-full duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Topics Grid Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-900/50 border-b border-border">
                      <tr className="text-muted-foreground">
                        <th className="px-6 py-4 font-medium w-1/3">Konu Başlığı</th>
                        <th className="px-6 py-4 font-medium text-center">1. Konu Çalışıldı</th>
                        <th className="px-6 py-4 font-medium text-center">2. Soru Çözüldü</th>
                        <th className="px-6 py-4 font-medium text-center">3. Tekrar Edildi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {subjectObj.topics.map(topic => {
                        const topicState = matrix[`${subjectObj.name}-${topic}`] || { study: 0, solve: 0, review: 0 };
                        
                        return (
                          <tr key={topic} className="hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-card-foreground border-r border-border/50">
                              {topic}
                            </td>
                            {/* Konu Çalışıldı */}
                            <td className="px-6 py-4 text-center border-r border-border/50">
                              <button 
                                onClick={() => handleBoxClick(subjectObj.name, topic, 'study')}
                                className={cn("inline-flex size-7 items-center justify-center rounded-md border transition-all mx-auto focus:outline-none focus:ring-2 focus:ring-primary", getBoxStyle(topicState.study))}
                                title="Konu Çalışıldı"
                              >
                                {topicState.study === 2 && <CheckCircle2 className="size-4" />}
                                {topicState.study === 1 && <CircleDashed className="size-4" />}
                              </button>
                            </td>
                            {/* Soru Çözüldü */}
                            <td className="px-6 py-4 text-center border-r border-border/50">
                              <button 
                                onClick={() => handleBoxClick(subjectObj.name, topic, 'solve')}
                                className={cn("inline-flex size-7 items-center justify-center rounded-md border transition-all mx-auto focus:outline-none focus:ring-2 focus:ring-primary", getBoxStyle(topicState.solve))}
                                title="Soru Çözüldü"
                              >
                                {topicState.solve === 2 && <CheckCircle2 className="size-4" />}
                                {topicState.solve === 1 && <CircleDashed className="size-4" />}
                              </button>
                            </td>
                            {/* Tekrar Edildi */}
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => handleBoxClick(subjectObj.name, topic, 'review')}
                                className={cn("inline-flex size-7 items-center justify-center rounded-md border transition-all mx-auto focus:outline-none focus:ring-2 focus:ring-primary", getBoxStyle(topicState.review))}
                                title="Tekrar Edildi"
                              >
                                {topicState.review === 2 && <CheckCircle2 className="size-4" />}
                                {topicState.review === 1 && <CircleDashed className="size-4" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        {renderedData.length === 0 && (
          <div className="py-20 text-center">
            <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-card-foreground">Harika İş!</h3>
            <p className="text-muted-foreground mt-2">Bu filtreye uygun herhangi bir eksik konu kalmamış.</p>
          </div>
        )}
      </main>
    </DashboardShell>
  );
}
