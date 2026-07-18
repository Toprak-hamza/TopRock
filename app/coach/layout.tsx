"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationHub } from "@/components/dashboard/notification-hub";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { Users, LogOut, Loader2, BookOpen, Library, Layers, Megaphone, Menu, X, FileText, Copy, CalendarDays } from "lucide-react";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "coach")) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-dvh bg-background">
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
          "fixed inset-y-0 left-0 z-[100] flex h-dvh w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-6">
          <div className="flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Koç Paneli</span>
          </div>
          <button 
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <Link
            href="/coach/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground bg-primary/10 transition-colors hover:bg-primary/20"
          >
            <Users className="h-5 w-5" /> Öğrencilerim
          </Link>
          <Link
            href="/coach/groups"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground bg-primary/10 transition-colors hover:bg-primary/20 mt-1"
          >
            <Layers className="h-5 w-5" /> Sınıflar
          </Link>
          <Link
            href="/coach/assignments"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground bg-primary/10 transition-colors hover:bg-primary/20 mt-1"
          >
            <BookOpen className="h-5 w-5" /> Ödevlendir
          </Link>
          <Link
            href="/coach/schedule"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 bg-sky-500/10 transition-colors hover:bg-sky-500/20 mt-1"
          >
            <CalendarDays className="h-5 w-5" /> Haftalık Program
          </Link>
          <Link
            href="/coach/curriculum"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-500/10 transition-colors hover:bg-emerald-500/20 mt-1"
          >
            <Library className="h-5 w-5" /> Müfredat Editörü
          </Link>
          <Link
            href="/coach/announcements"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 bg-rose-500/10 transition-colors hover:bg-rose-500/20 mt-1"
          >
            <Megaphone className="h-5 w-5" /> Duyurular
          </Link>
          <Link
            href="/coach/templates"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-purple-600 bg-purple-500/10 transition-colors hover:bg-purple-500/20 mt-1"
          >
            <Copy className="h-5 w-5" /> Hazır Şablonlar
          </Link>
          <Link
            href="/coach/reports"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-amber-600 bg-amber-500/10 transition-colors hover:bg-amber-500/20 mt-1"
          >
            <FileText className="h-5 w-5" /> Veli Raporları
          </Link>
        </nav>
        <div className="border-t border-border/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground truncate max-w-[140px]">
              {user.name}
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" /> Çıkış Yap
          </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-dvh overflow-hidden w-full">
        {/* Topbar */}
        <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 sm:px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-lg md:hidden shrink-0"
            >
              <Menu className="size-6" />
            </button>
            <span className="text-base sm:text-lg font-bold tracking-tight md:hidden truncate">Koç Paneli</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
            <NotificationHub />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="p-4 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
