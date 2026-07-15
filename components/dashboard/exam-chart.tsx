"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ExamDetail } from "@/lib/auth";
import { Loader2, TrendingUp } from "lucide-react";

export function ExamChart({ exams, isLoading }: { exams: ExamDetail[], isLoading?: boolean }) {
  const chartData = useMemo(() => {
    // Chronological order for charts
    const sorted = [...exams].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
   
    return sorted.map(ex => ({
      name: new Date(ex.date).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
      net: ex.overallNet,
      fullName: ex.title || "Deneme Sınavı"
    }));
  }, [exams]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
        <TrendingUp className="size-8 opacity-20 mb-2" />
        <p className="text-sm">Henüz sınav verisi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
            labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
            formatter={(val: any) => [`${val} Net`, "Toplam Net"]}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) return payload[0].payload.fullName + " (" + label + ")";
              return label;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="net" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorNet)" 
            activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
