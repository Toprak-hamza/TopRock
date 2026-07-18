"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, getUsers } from "@/lib/auth";
import { WeeklyProgramEditor } from "@/components/coach/weekly-program-editor";
import { 
  CalendarDays, 
  UserCheck, 
  Loader2, 
  Search, 
  Clock, 
  Calendar,
  Sparkles,
  ChevronRight,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function CoachScheduleContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId");

  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<"tasks" | "timeblocks">("tasks");

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "coach") {
        router.push("/login");
        return;
      }

      const fetchStudents = async () => {
        try {
          const allUsers = await getUsers();
          const coachStudents = allUsers.filter(u => u.role === "student" && u.coachId === user.id);
          setStudents(coachStudents);

          if (initialStudentId && coachStudents.some(s => s.id === initialStudentId)) {
            setSelectedStudentId(initialStudentId);
          } else if (coachStudents.length > 0) {
            setSelectedStudentId(coachStudents[0].id);
          }
        } catch (e) {
          console.error("Error fetching coach students:", e);
        } finally {
          setLoading(false);
        }
      };

      fetchStudents();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, initialStudentId, router]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center">
        <div className="rounded-full bg-primary/10 p-4 text-primary mb-4">
          <CalendarDays className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Henüz Öğrenciniz Yok</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Haftalık program hazırlayabilmek için önce öğrenci eklemeniz veya referans davet kodunuzu öğrencinizle paylaşmanız gerekmektedir.
        </p>
        <Link
          href="/coach/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
        >
          <UserCheck className="h-4 w-4" /> Öğrencilerim Paneline Git
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Haftalık Program Editörü
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Sparkles className="size-3" /> Koç Yönetim Paneli
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Öğrencilerinizin haftalık çalışma ders takvimini, hedef soru sayılarını ve günlük ödevlerini planlayın.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1.5 border border-border/60 shrink-0">
          <button
            onClick={() => setActiveMode("tasks")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeMode === "tasks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="size-3.5 text-primary" /> Günlük Görev Takvimi
          </button>
          <button
            onClick={() => setActiveMode("timeblocks")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
              activeMode === "timeblocks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="size-3.5 text-amber-500" /> Saatlik Program Saatleri
          </button>
        </div>
      </div>

      {/* Student Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCheck className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Programı Hazırlanan Öğrenci
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-transparent font-bold text-base text-foreground border-0 focus:ring-0 cursor-pointer outline-none p-0"
            >
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id} className="bg-card text-foreground py-1">
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Student Search & Profile Link */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary w-40 sm:w-48 text-foreground"
            />
          </div>

          {selectedStudent && (
            <Link
              href={`/coach/student/${selectedStudent.id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/10 transition-colors"
            >
              Profili İncele <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Selected Mode View */}
      {selectedStudent && user ? (
        activeMode === "tasks" ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <WeeklyProgramEditor studentId={selectedStudent.id} coachId={user.id} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Clock className="size-5 text-amber-500" />
                  {selectedStudent.name} - Saatlik Ders & Etüt Takvimi
                </h3>
                <p className="text-xs text-muted-foreground">
                  Öğrencinin gün içindeki saat aralıklarına göre (09:00 - 10:00) ders ve etüt programını oluşturun.
                </p>
              </div>
              <Link
                href={`/coach/schedule/${selectedStudent.id}`}
                className="text-xs font-bold text-primary hover:underline"
              >
                Tam Ekran Düzenleyici &rarr;
              </Link>
            </div>
            {/* Quick Link Banner */}
            <div className="p-4 bg-muted/20 rounded-xl border border-border/40 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Saatlik detaylı blok programını tam ekran üzerinde düzenlemek için tıklayın:
              </span>
              <Link
                href={`/coach/schedule/${selectedStudent.id}`}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all"
              >
                Saatlik Programı Aç
              </Link>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

export default function CoachSchedulePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CoachScheduleContent />
    </Suspense>
  );
}
