"use client";

import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GununOdevleri } from "@/components/dashboard/gunun-odevleri";
import { GununGorevleri } from "@/components/dashboard/gunun-gorevleri";
import { CoachMessageCard } from "@/components/dashboard/coach-message-card";
import { AnnouncementList } from "@/components/dashboard/announcement-list";
import { RockPointsBadge } from "@/components/dashboard/rock-points-badge";
import { PomodoroTimer } from "@/components/dashboard/pomodoro-timer";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  return (
    <DashboardShell
      activePath="/dashboard"
      title={isLoading ? "Hoş geldin..." : `Hoş geldin, ${user?.name || 'Şampiyon'}`}
      subtitle="Bugün ne yapmalıyım? İşte bugünkü programın, görevlerin ve hedeflerin."
      headerActions={<RockPointsBadge />}
    >
      <main className="space-y-6 px-8 py-8 pb-12">
        
        {/* Koç Özel Geri Bildirimi */}
        <CoachMessageCard />

        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Sol/Orta Kolon: Günün Görevleri, Ödevleri ve Duyurular */}
          <div className="lg:col-span-2 space-y-6">
            <GununGorevleri />
            <GununOdevleri />
            <AnnouncementList />
          </div>

          {/* Sağ Kolon: Pomodoro Sayacı */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Pomodoro Çalışma Seansı</h3>
              <PomodoroTimer />
            </div>
          </div>
        </div>

      </main>
    </DashboardShell>
  );
}
