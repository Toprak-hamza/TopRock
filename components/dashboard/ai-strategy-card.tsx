"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { BrainCircuit, Sparkles, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { analyzeStudentData, AiInsight, InsightPriority } from "@/lib/ai-engine";

export function AiStrategyCard() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AiInsight[]>([]);

  const loadData = async () => {
    if (!user || user.role !== "student") return;
    try {
      const computed = await analyzeStudentData(user.id);
      setInsights(computed || []);
    } catch (e) {
      console.error(e);
      setInsights([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("rocksolid_data_change", loadData);
    return () => window.removeEventListener("rocksolid_data_change", loadData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (insights.length === 0) return null;

  const getPriorityClasses = (priority: InsightPriority) => {
    switch (priority) {
      case "high":
        return "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
      case "medium":
        return "border-orange-500/50 bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]";
      case "low":
      default:
        return "border-blue-500/50 bg-blue-500/10 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
    }
  };

  const getIcon = (type: string, priority: InsightPriority) => {
    if (priority === 'high') return <AlertTriangle className="size-5" />;
    if (type === 'critical_path') return <Sparkles className="size-5" />;
    if (type === 'pacing') return <TrendingUp className="size-5" />;
    return <Info className="size-5" />;
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-lg flex flex-col overflow-hidden relative">
      {/* Glow Backdrop */}
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-3 backdrop-blur-sm z-10">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
          <BrainCircuit className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">AI Strateji Merkezi</h2>
          <p className="text-xs text-muted-foreground">Veri Füzyonu ile Kişiselleştirilmiş Optimizasyonlar</p>
        </div>
      </div>

      <div className="p-5 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 z-10">
        {insights.map(insight => (
          <div 
            key={insight.id} 
            className={`p-4 rounded-xl border relative flex flex-col gap-3 transition-transform hover:-translate-y-1 ${getPriorityClasses(insight.priority)}`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {getIcon(insight.type, insight.priority)}
              <h3 className="text-sm">{insight.title}</h3>
            </div>
            <p className="text-sm text-foreground opacity-90 leading-relaxed font-medium">
              {insight.message}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
