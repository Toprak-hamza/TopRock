"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { User, Feedback, getFeedbacks, deleteStudentCascading, getHomeworks, saveFeedback, mapProfileToUser } from "@/lib/auth";
import { analyzeStudentData, AiInsight } from "@/lib/ai-engine";
import { RemoteMatrixViewer } from "@/components/coach/remote-matrix-viewer";
import { ExamArchive } from "@/components/dashboard/exam-archive";
import { WeeklyProgramEditor } from "@/components/coach/weekly-program-editor";
import { Eye, ArrowLeft, Loader2, Bot, Clock, Percent, Table2, Target, Timer, MessageSquare, Send, Trash2, AlertTriangle, AlertCircle, Sparkles, CheckSquare, TestTube, Trophy, Zap, CheckCircle, Flag, Flame, Award, CalendarDays } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const iconMap: Record<string, any> = {
  Zap,
  CheckCircle,
  Target,
  Flag,
  Flame,
  Award
};

// Progress bar specifically for read-only view
function ProgressBar({
  value,
  max,
  barClassName,
}: {
  value: number;
  max: number;
  barClassName: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function StudentProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const [student, setStudent] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Stats mapped from localStorage for this specific student
  const [matrixProgress, setMatrixProgress] = useState(0);
  const [lastExamNet, setLastExamNet] = useState<number | null>(null);
  const [hwSuccessPct, setHwSuccessPct] = useState<number | null>(null);
  const [exams, setExams] = useState<any[]>([]);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [newFeedbackContent, setNewFeedbackContent] = useState("");
  const [insights, setInsights] = useState<AiInsight[]>([]);

  // Delete State (0: hidden, 1: first warning, 2: final warning)
  const [deleteStage, setDeleteStage] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "program">("profile");


  // Gamification & Badges
  const [gamification, setGamification] = useState<any | null>(null);
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [studentBadges, setStudentBadges] = useState<any[]>([]);
  const [badgeLoading, setBadgeLoading] = useState(false);

  const loadData = async (targetStudent: User) => {
    const matrixDataStr = localStorage.getItem("rocksolid_matrix_progress");
    if (matrixDataStr) {
      const matrixData = JSON.parse(matrixDataStr);
      setMatrixProgress(matrixData[targetStudent.id] || 0);
    }

    try {
      const { getDetailedExams } = await import("@/lib/auth");
      const stExams = await getDetailedExams(targetStudent.id);
      setExams(stExams);
      
      if (stExams.length > 0) {
        setLastExamNet(stExams[0].overallNet);
      }

      const studentHws = await getHomeworks(targetStudent.id);
      const completedHws = studentHws.filter(h => h.completed && h.correctCount !== undefined);
      if (completedHws.length > 0) {
        let totalC = 0, totalI = 0, totalE = 0;
        completedHws.forEach(h => {
          totalC += h.correctCount || 0;
          totalI += h.incorrectCount || 0;
          totalE += h.emptyCount || 0;
        });
        const total = totalC + totalI + totalE;
        if (total > 0) {
          setHwSuccessPct(Math.round((totalC / total) * 100));
        } else {
          setHwSuccessPct(null);
        }
      } else {
        setHwSuccessPct(null);
      }

      const fbData = await getFeedbacks(targetStudent.id);
      setFeedbacks(fbData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Load gamification & badges
      const { getStudentGamification, getBadges, getStudentBadges } = await import("@/lib/auth");
      const gamData = await getStudentGamification(targetStudent.id);
      setGamification(gamData);

      const badgesList = await getBadges();
      setAllBadges(badgesList);

      const stBadges = await getStudentBadges(targetStudent.id);
      setStudentBadges(stBadges);
    } catch (e) {
      console.error(e);
      setFeedbacks([]);
    }
    const computedInsights = await analyzeStudentData(targetStudent.id);
    setInsights(computedInsights);
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== "coach") {
        router.push("/login");
        return;
      }

      const fetchTargetStudent = async () => {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', params.id)
            .eq('coach_id', user.id)
            .single();

          if (profileData && !error) {
            const targetStudent = mapProfileToUser(profileData);
            setStudent(targetStudent);
            await loadData(targetStudent);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingData(false);
        }
      };

      fetchTargetStudent();
    }
  }, [user, isLoading, params.id, router]);

  if (isLoading || loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSendFeedback = async () => {
    if (!newFeedbackContent.trim() || !user || !student) return;

    try {
      await saveFeedback({
        studentId: student.id,
        coachId: user.id,
        content: newFeedbackContent
      });
      setNewFeedbackContent("");
      await loadData(student);
    } catch (e) {
      console.error("Error saving feedback:", e);
    }
  };

  const handleToggleBadge = async (badgeId: string, hasBadge: boolean) => {
    if (!student) return;
    setBadgeLoading(true);
    try {
      const { awardBadge, revokeBadge, getStudentBadges } = await import("@/lib/auth");
      if (hasBadge) {
        await revokeBadge(student.id, badgeId);
      } else {
        await awardBadge(student.id, badgeId);
      }
      const stBadges = await getStudentBadges(student.id);
      setStudentBadges(stBadges);
    } catch (e) {
      console.error("Error toggling badge:", e);
    } finally {
      setBadgeLoading(false);
    }
  };

  const executeSecureDelete = () => {
    if (!student) return;
    deleteStudentCascading(student.id);
    setDeleteStage(0);
    // Simple toast fallback since we don't have a toast provider setup globally yet
    alert("Öğrenci ve ilişkili tüm veriler başarıyla silindi.");
    router.push("/coach/dashboard");
  };

  if (!student) {
    return (
      <div className="text-center p-12 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Öğrenci bulunamadı veya bu öğrenciyi görüntüleme yetkiniz yok.</p>
        <Link href="/coach/dashboard" className="text-primary mt-4 inline-flex items-center gap-2 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Geri Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Readability Notice */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6">
        <Link href="/coach/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
          <ArrowLeft className="h-4 w-4" /> Öğrencilerime Dön
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {student.name}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Öğrenci Profili
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{student.email}</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-600 rounded-lg border border-yellow-500/20 shadow-sm animate-pulse-slow">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Salt Okunur Mod (Gözlem)</span>
          </div>
        </div>
      </div>

      {/* Sekme Seçici (Tab Bar) */}
      <div className="flex border-b border-border/60 gap-4">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all active:scale-95",
            activeTab === "profile" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className="size-4" /> Genel Profil & AI Analizi
        </button>
        <button
          onClick={() => setActiveTab("program")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all active:scale-95",
            activeTab === "program" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="size-4" /> Haftalık Program Editörü
        </button>
      </div>

      {activeTab === "profile" ? (
        <>
          {/* Stats Cards */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${hwSuccessPct !== null && hwSuccessPct < 50 ? 'border-orange-500/50 bg-orange-500/5' : 'border-border bg-card'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckSquare className={`h-16 w-16 transform rotate-12 ${hwSuccessPct !== null && hwSuccessPct < 50 ? 'text-orange-500' : 'text-primary'}`} />
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <CheckSquare className={`size-5 ${hwSuccessPct !== null && hwSuccessPct < 50 ? 'text-orange-500' : 'text-primary'}`} />
            <h2 className={`text-sm font-semibold ${hwSuccessPct !== null && hwSuccessPct < 50 ? 'text-orange-600 dark:text-orange-400' : 'text-card-foreground'}`}>Ödev Başarı Oranı</h2>
          </div>
          <p className={`mt-4 text-3xl font-semibold tracking-tight relative z-10 ${hwSuccessPct !== null && hwSuccessPct < 50 ? 'text-orange-600 dark:text-orange-400' : 'text-card-foreground'}`}>
            {hwSuccessPct !== null ? `%${hwSuccessPct}` : "--"}
          </p>
          <div className="mt-4 relative z-10">
            <ProgressBar value={hwSuccessPct || 0} max={100} barClassName={hwSuccessPct !== null && hwSuccessPct < 50 ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-primary to-blue-500"} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target className="h-16 w-16 text-violet-500 transform rotate-12" />
          </div>
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-violet-400" />
              <h2 className="text-sm font-semibold text-card-foreground">Haftalık Soru</h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">840 / 1200</span>
          </div>
          <div className="mt-4 relative z-10">
            <ProgressBar value={840} max={1200} barClassName="bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground relative z-10">Hedefin %70&apos;ü tamamlandı.</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Percent className="h-16 w-16 text-emerald-500 transform rotate-12" />
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <Percent className="size-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-card-foreground">Son Deneme Neti</h2>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-card-foreground relative z-10">
            {lastExamNet !== null ? lastExamNet : "--"}
          </p>
          <div className="mt-4 relative z-10">
            <ProgressBar value={lastExamNet || 0} max={120} barClassName="bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="h-16 w-16 text-sky-500 transform rotate-12" />
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <Clock className="size-5 text-sky-400" />
            <h2 className="text-sm font-semibold text-card-foreground">Çalışma Süresi</h2>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-card-foreground relative z-10">
            4.5 Saat
          </p>
          <p className="mt-1 text-sm text-muted-foreground relative z-10">Bugünkü odaklanmış çalışma</p>
        </article>
      </section>

      {/* Sınav Arşivi ve Koç Değerlendirmesi */}
      <section className="rounded-xl border border-border bg-card shadow-sm flex flex-col gap-0 overflow-hidden">
        <div className="p-6 border-b border-border/50 bg-muted/10 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <TestTube className="size-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">Deneme Sınavı Arşivi</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Öğrencinin girdiği tüm sınavlar ve analizler. Öğrenciye not bırakabilirsiniz.</p>
          </div>
        </div>
        <div className="p-6 bg-muted/5">
          <ExamArchive exams={exams} asCoach={true} onExamUpdated={() => { if (student) loadData(student); }} />
        </div>
      </section>

      {/* Remote Curriculum Matrix Monitoring */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
            <Table2 className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">Öğrenci Konu Matrisi (Canlı)</h3>
            <p className="text-sm text-muted-foreground">Bu alan öğrencinin paneli ile anlık senkronizedir. Öğrencinin işaretlediği kutucukları anlık yansıtır.</p>
          </div>
        </div>
        
        <RemoteMatrixViewer studentId={student.id} />
      </section>

      {/* Oyunlaştırma ve Rozet Yönetimi */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/25">
            <Trophy className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">Oyunlaştırma & Rozet Yönetimi</h3>
            <p className="text-sm text-muted-foreground">Öğrencinin güncel seviyesini ve XP durumunu izleyin, kazanılan rozetleri yönetin.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* XP ve Level Kartı */}
          <div className="md:col-span-1 border border-border/60 bg-muted/5 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-violet-500 dark:text-violet-400 uppercase">Seviye Durumu</span>
              <h4 className="text-3xl font-black text-foreground mt-1">Seviye {gamification?.currentLevel || 1}</h4>
              <p className="text-sm text-muted-foreground mt-2">Toplam Puan: <strong>{gamification?.totalXp || 0} XP</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Bir sonraki seviye için: {1000 - ((gamification?.totalXp || 0) % 1000)} XP gerekli.</p>
            </div>
            
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{ width: `${((gamification?.totalXp || 0) % 1000) / 10}%` }}
                />
              </div>
            </div>
          </div>

          {/* Rozet Yönetim Paneli */}
          <div className="md:col-span-2 border border-border/60 rounded-xl p-5 bg-card">
            <h4 className="text-sm font-bold text-foreground mb-4">Öğrenci Rozetleri</h4>
            {badgeLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : allBadges.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Hiç rozet bulunamadı.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {allBadges.map(badge => {
                  const hasBadge = studentBadges.some(sb => sb.id === badge.id);
                  const IconComponent = iconMap[badge.iconName] || Award;
                  
                  return (
                    <div 
                      key={badge.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                        hasBadge 
                          ? "border-emerald-500/20 bg-emerald-500/5 text-foreground shadow-sm shadow-emerald-500/5" 
                          : "border-border/60 bg-muted/5 text-muted-foreground opacity-65"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-lg border shrink-0",
                          hasBadge ? "bg-emerald-500 text-white border-emerald-500" : "bg-muted text-muted-foreground border-border"
                        )}>
                          <IconComponent className="size-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-xs block text-foreground">{badge.title}</span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">{badge.description}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleBadge(badge.id, hasBadge)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm transition-all active:scale-95 ml-2 shrink-0",
                          hasBadge
                            ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 dark:text-emerald-400"
                        )}
                      >
                        {hasBadge ? "Geri Al" : "Ödüllendir"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sistem Analizi (AI Diagnostics) */}
      <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center gap-3 bg-muted/20">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
            <Bot className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">AI Sistem Analizi (Arıza Teşhis)</h3>
            <p className="text-xs text-muted-foreground">Veri Füzyonu ile saptanan yapısal arızalar ve fırsatlar.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertCircle className="size-5" />
              <h4 className="font-semibold text-sm">Yalancı Güven (Verimsiz Çalışma)</h4>
            </div>
            {insights.filter(i => i.type === 'weak_link').length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sistem bu kategoride güncel bir risk saptamadı.</p>
            ) : (
              insights.filter(i => i.type === 'weak_link').map(insight => (
                <div key={insight.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <span className="font-bold underline uppercase text-xs mb-1 block">{insight.relatedSubject}</span>
                  {insight.message}
                </div>
              ))
            )}
          </div>
          
          <div className="p-5 flex flex-col gap-3 h-full bg-muted/5">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Sparkles className="size-5" />
              <h4 className="font-semibold text-sm">Kaçırılan Fırsatlar (Kritik Yol)</h4>
            </div>
            {insights.filter(i => i.type === 'critical_path').length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sistem bu kategoride gözden kaçan bir fırsat saptamadı.</p>
            ) : (
              insights.filter(i => i.type === 'critical_path').map(insight => (
                <div key={insight.id} className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-bold underline uppercase text-xs mb-1 block">{insight.relatedSubject}</span>
                  {insight.message}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Koç Geri Bildirim Hub'ı */}
      <section className="rounded-xl border border-border bg-card shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Form Alanı */}
        <div className="p-6 md:w-1/2 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Öğrenciye Not & Geri Bildirim</h3>
          </div>
          <p className="text-sm text-muted-foreground">Bu mesaj öğrencinin ana ekranında &quot;Yeni Mesaj&quot; olarak belirecektir.</p>
          <textarea
            value={newFeedbackContent}
            onChange={(e) => setNewFeedbackContent(e.target.value)}
            placeholder="Haftalık değerlendirmeni buraya yaz..."
            className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSendFeedback}
            disabled={!newFeedbackContent.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="size-4" /> Gönder
          </button>
        </div>
        
        {/* Geçmiş Mesajlar Alanı */}
        <div className="p-6 md:w-1/2 bg-muted/10 h-[320px] flex flex-col">
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4">Gönderilen Geçmiş Notlar</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {feedbacks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center opacity-50">
                <MessageSquare className="size-8 mb-2" />
                <p className="text-xs text-center">Henüz bir geri bildirim göndermediniz.</p>
              </div>
            ) : (
              feedbacks.map(fb => (
                <div key={fb.id} className={`p-3 rounded-lg border ${fb.isRead ? "bg-background border-border" : "bg-primary/5 border-primary/20"}`}>
                  <p className="text-sm text-foreground mb-2">&quot;{fb.content}&quot;</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{new Date(fb.createdAt).toLocaleString("tr-TR")}</span>
                    <span className={fb.isRead ? "text-green-500 font-medium" : "text-amber-500 font-medium animate-pulse"}>
                      {fb.isRead ? "Okundu" : "Bekliyor"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Güvenli Silme Alanı */}
      <div className="mt-12 flex justify-center pb-8 border-t border-border/50 pt-8">
        <button
          onClick={() => setDeleteStage(1)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 hover:border-red-500/30 transition-all focus:ring-4 focus:ring-red-500/20 active:scale-95 font-medium"
        >
          <Trash2 className="size-5" /> Öğrenciyi ve Tüm Verileri Sil
        </button>
      </div>
        </>
      ) : (
        <WeeklyProgramEditor studentId={student.id} coachId={user?.id || ""} />
      )}

      {/* Delete Confirmation Modals */}
      {deleteStage > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
            
            {deleteStage === 1 && (
              <>
                <div className="flex flex-col items-center text-center gap-4 mb-6">
                  <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full">
                    <AlertTriangle className="size-8" />
                  </div>
                  <h3 className="text-xl font-bold">Öğrenciyi Sil</h3>
                  <p className="text-muted-foreground">Bu öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
                </div>
                <div className="flex gap-3 justify-end mt-8">
                  <button onClick={() => setDeleteStage(0)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors border border-transparent">İptal</button>
                  <button 
                    onClick={() => setDeleteStage(2)} 
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    Devam Et
                  </button>
                </div>
              </>
            )}

            {deleteStage === 2 && (
              <>
                <div className="flex flex-col items-center text-center gap-4 mb-6">
                  <div className="p-4 bg-red-500/10 text-red-500 rounded-full animate-pulse">
                    <Trash2 className="size-8" />
                  </div>
                  <h3 className="text-xl font-bold text-red-500">Kalıcı Silme Onayı</h3>
                  <p className="text-sm border border-red-500/20 bg-red-500/5 p-4 rounded-lg text-foreground">
                    <strong className="block mb-2 text-red-500">DİKKAT!</strong>
                    Öğrencinin (&quot;{student.name}&quot;) tüm deneme netleri, ödevleri, koç notları ve haftalık programı <strong>kalıcı olarak</strong> silinecektir. Onaylıyor musunuz?
                  </p>
                </div>
                <div className="flex gap-3 justify-end mt-8">
                  <button onClick={() => setDeleteStage(0)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">Vazgeç</button>
                  <button 
                    onClick={executeSecureDelete} 
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors border-2 border-red-600 hover:border-red-700 active:scale-95"
                  >
                    KALICI OLARAK SİL
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
