"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ScheduleBlock, getSchedules } from "@/lib/auth";
import { CalendarDays, Clock, Play } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const COLORS = [
  { value: "blue", class: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/20" },
  { value: "red", class: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:bg-red-500/20" },
  { value: "emerald", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20" },
  { value: "violet", class: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400 dark:bg-violet-500/20" },
  { value: "amber", class: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/20" },
  { value: "fuchsia", class: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-400 dark:bg-fuchsia-500/20" }
];

export default function StudentSchedulePage() {
  const { user, isLoading } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [currentDayStr, setCurrentDayStr] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  
  // Real JS Date day (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  // We need to map to our index: 0 = Monday, 6 = Sunday
  const [activeDayIdx, setActiveDayIdx] = useState(-1);
  const [activeTimeValue, setActiveTimeValue] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    
    const fetchSch = async () => {
      try {
        const allSch = await getSchedules(user.id);
        setSchedules(allSch);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSch();

    // Dynamic Time Clock
    const updateTime = () => {
      const now = new Date();
      // Calculate our custom Day Index (0 = Monday, ..., 6 = Sunday)
      let currentIdx = now.getDay() - 1;
      if (currentIdx === -1) currentIdx = 6; // Sunday
      setActiveDayIdx(currentIdx);
      
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}`);
      setActiveTimeValue(now.getHours() * 60 + now.getMinutes());
      
      setCurrentDayStr(DAYS[currentIdx]);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  // Derived Active Block
  const activeBlock = schedules.find(s => {
    if (s.dayOfWeek !== activeDayIdx) return false;
    const [startH, startM] = s.startTime.split(":").map(Number);
    const [endH, endM] = s.endTime.split(":").map(Number);
    
    const startVal = startH * 60 + startM;
    const endVal = endH * 60 + endM;
    
    return activeTimeValue >= startVal && activeTimeValue < endVal;
  });

  return (
    <DashboardShell
      activePath="/dashboard/schedule"
      title="Haftalık Program"
      subtitle="Koçun tarafından belirlenmiş haftalık rotan."
    >
      <main className="space-y-6 px-4 md:px-8 py-8 pb-12">
        {/* Dynamic Current Task Hero */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 p-16 bg-primary/5 rounded-full blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2 text-primary">
                <CalendarDays className="size-5" />
                <h2 className="text-sm font-semibold tracking-wider uppercase">Bugün: {currentDayStr}</h2>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span className="text-lg font-medium">{currentTimeStr}</span>
              </div>
            </div>

            <div className="flex-1 md:ml-12 border-l-2 border-border/50 pl-6 py-2">
              <h3 className="text-sm text-muted-foreground mb-1">Şu Anki Görev</h3>
              {activeBlock ? (
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xl font-bold text-foreground">{activeBlock.title}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-semibold">
                    {activeBlock.startTime} - {activeBlock.endTime}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Play className="size-4" /> Şu an programlanmış bir görev bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
          {DAYS.map((dayName, dayIndex) => {
            const isToday = dayIndex === activeDayIdx;
            const dayBlocks = schedules
              .filter(s => s.dayOfWeek === dayIndex)
              .sort((a,b) => a.startTime.localeCompare(b.startTime));

            return (
              <div key={dayIndex} className={`flex flex-col rounded-xl border shadow-sm overflow-hidden min-h-[400px] ${isToday ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]" : "border-border bg-card"}`}>
                <div className={`p-3 border-b text-center font-semibold text-sm ${isToday ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 border-border text-foreground"}`}>
                  {dayName}
                  {isToday && <span className="block text-[10px] uppercase mt-0.5 tracking-wider font-bold">Bugün</span>}
                </div>
                
                <div className="flex-1 p-3 space-y-2 relative">
                  {dayBlocks.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 font-medium">Boş</div>
                  ) : (
                    dayBlocks.map(block => {
                      const colorObj = COLORS.find(c => c.value === block.color) || COLORS[0];
                      const isActiveBlock = activeBlock?.id === block.id;

                      return (
                        <div 
                          key={block.id} 
                          className={`p-3 rounded-lg border flex flex-col gap-2 relative transition-all ${colorObj.class} ${isActiveBlock ? "ring-2 ring-emerald-500 scale-[1.02] shadow-lg" : ""}`}
                        >
                          {isActiveBlock && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                          )}
                          <span className="font-semibold text-sm leading-tight">{block.title}</span>
                          <div className="flex items-center gap-1.5 text-xs opacity-80 font-medium">
                            <Clock className="size-3.5" />
                            {block.startTime} - {block.endTime}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </DashboardShell>
  );
}
