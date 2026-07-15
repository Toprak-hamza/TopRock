"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { logout, getStudentGamification, getStudentBadges } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

import {
  BarChart3,
  BookOpenCheck,
  Grid3x3,
  Home,
  Timer,
  LogOut,
  CalendarDays,
  Menu,
  X,
  Zap,
  CheckCircle,
  Target,
  Flag,
  Flame,
  Award
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { NotificationHub } from "./notification-hub";

const iconMap: Record<string, any> = {
  Zap,
  CheckCircle,
  Target,
  Flag,
  Flame,
  Award
};

export const dashboardNavItems = [
  { href: "/dashboard", label: "Ana Sayfa", icon: Home },
  { href: "/dashboard/topics", label: "Konu Matrisi", icon: Grid3x3 },
  { href: "/dashboard/exams", label: "Deneme Sınavları", icon: BarChart3 },
  { href: "/dashboard/books", label: "Kitap Takip", icon: BookOpenCheck },
  { href: "/dashboard/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/dashboard/schedule", label: "Haftalık Program", icon: CalendarDays },
] as const;

type DashboardShellProps = {
  children: ReactNode;
  /** Path used for active nav highlight, e.g. `/dashboard` or `/dashboard/pomodoro` */
  activePath: string;
  title: string;
  subtitle?: string;
  /** Sağ üstte tema anahtarının yanında (ör. RockPoints) */
  headerActions?: React.ReactNode;
};

export function DashboardShell({
  children,
  activePath,
  title,
  subtitle,
  headerActions,
}: DashboardShellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gamification, setGamification] = useState<{ totalXp: number; currentLevel: number } | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);

  const loadGamification = async () => {
    if (!user || user.role !== "student") return;
    try {
      const gamData = await getStudentGamification(user.id);
      setGamification(gamData);

      const badgesList = await getStudentBadges(user.id);
      setEarnedBadges(badgesList);
    } catch (e) {
      console.error("Error loading sidebar gamification:", e);
    }
  };

  useEffect(() => {
    if (user && user.role === "student") {
      loadGamification();
      
      const channel = supabase.channel(`sidebar_gamification_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_gamification', filter: `student_id=eq.${user.id}` }, () => {
          loadGamification();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_badges', filter: `student_id=eq.${user.id}` }, () => {
          loadGamification();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[100] flex h-dvh w-64 shrink-0 flex-col border-r border-white/10 bg-slate-950 text-slate-200 transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-white/10 px-5 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              BitigEdu
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-white">
              Öğrenci Paneli
            </p>
          </div>
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {dashboardNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "hover:bg-white/10 hover:text-white",
                href === activePath
                  ? "bg-white/10 text-white ring-1 ring-white/10"
                  : "text-slate-400",
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-90" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        
        {/* Mini Gamification Hub */}
        {user && user.role === "student" && gamification && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/20 shadow-inner">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black tracking-wider text-violet-400 uppercase">Seviye {gamification.currentLevel}</span>
              <span className="text-[10px] font-bold text-slate-400">{gamification.totalXp % 1000} / 1000 XP</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2 relative">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                style={{ width: `${(gamification.totalXp % 1000) / 10}%` }}
              />
            </div>
            {/* Badge Preview */}
            {earnedBadges.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                <span className="text-[9px] text-slate-500 font-medium">Rozetler:</span>
                <div className="flex gap-1">
                  {earnedBadges.slice(-3).map((badge) => {
                    const IconComponent = iconMap[badge.iconName] || Award;
                    return (
                      <div 
                        key={badge.id} 
                        title={badge.title}
                        className="flex size-5 items-center justify-center rounded bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      >
                        <IconComponent className="size-3" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="min-h-dvh bg-background md:pl-64">
        <div
          className={cn(
            "pointer-events-none fixed inset-0 -z-10 md:left-64",
            "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--accent)/0.18),transparent)]",
            "dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_-15%,hsl(var(--accent)/0.28),transparent)]",
          )}
        />

        <header className="relative z-50 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/80 px-4 md:px-8 py-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg"
            >
              <Menu className="size-6" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {headerActions}
            <NotificationHub />
            <ThemeToggle />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
