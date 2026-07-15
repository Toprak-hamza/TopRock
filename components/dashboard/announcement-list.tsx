"use client";

import { useEffect, useState } from "react";
import { Megaphone, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Announcement, getAnnouncements, getGroupMembers, getUsers } from "@/lib/auth";

export function AnnouncementList() {
  const { user, isLoading: authLoading } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coachName, setCoachName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== "student") return;

      try {
        // Find coach name safely
        if (user.coachId) {
          const allUsers = await getUsers();
          const coach = allUsers.find(u => u.id === user.coachId);
          if (coach) setCoachName(coach.name);
        }

        const allAnns = await getAnnouncements();
        const myCoachAnns = allAnns.filter(a => a.coachId === user.coachId);
        
        const allMembers = await getGroupMembers();
        const myGroupIds = allMembers.filter(m => m.studentId === user.id).map(m => m.groupId);

        // Filter: does myGroupIds intersect with ann.targetGroupIds?
        const relevantAnns = myCoachAnns.filter(ann => 
          ann.targetGroupIds && ann.targetGroupIds.some(targetId => myGroupIds.includes(targetId))
        ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setAnnouncements(relevantAnns);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  // If loading or no announcements, maybe don't even render, or render loader if loading
  if (isLoading || authLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Duyurular yükleniyor...</span>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null; // Do not show anything if no announcements
  }

  const isRecent = (dateStr: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dateStr).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 3;
  };

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-lg font-bold flex items-center gap-2 tracking-tight">
        <Megaphone className="size-5 text-rose-500" /> Duyuru Panosu
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {announcements.map(ann => {
          const recent = isRecent(ann.createdAt);
          return (
            <div 
              key={ann.id} 
              className={`w-full rounded-xl border p-5 relative overflow-hidden transition-all ${
                  recent 
                    ? "border-rose-500/30 bg-rose-500/5 shadow-sm" 
                    : "border-border bg-card hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-foreground leading-tight pr-6">{ann.title}</h3>
                  {recent && (
                    <span className="absolute top-4 right-4 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-background"></span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3 font-medium">
                  <Calendar className="size-3.5" /> 
                  {new Date(ann.createdAt).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}
                  <span className="mx-1">•</span>
                  <span className="truncate">{coachName || "Yönetici Koç"}</span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {ann.content}
                </p>
              </div>
            )
        })}
      </div>
    </div>
  );
}
