"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { User, ScheduleBlock, getSchedules, saveSchedulesConfig, mapProfileToUser } from "@/lib/auth";
import { ArrowLeft, Loader2, Calendar, Plus, Trash2, Clock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const COLORS = [
  { value: "blue", class: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
  { value: "red", class: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400" },
  { value: "emerald", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" },
  { value: "violet", class: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400" },
  { value: "amber", class: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
  { value: "fuchsia", class: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-400" }
];

export default function CoachScheduleEditorPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Unwrap params for React 19 / Next 15 compatibility
  const resolvedParams = use(params);
  
  const [student, setStudent] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("blue");
  
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async (targetStudent: User) => {
    try {
      const allSchedules = await getSchedules(targetStudent.id);
      setSchedules(allSchedules);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "coach") {
        router.push("/login");
        return;
      }
      
      const initializePage = async () => {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', resolvedParams.studentId)
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

      initializePage();
    }
  }, [user, authLoading, resolvedParams.studentId, router]);

  // Handle Realtime updates for Schedule
  useEffect(() => {
    if (!student || !user) return;
    const channel = supabase.channel('coach_schedule_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `student_id=eq.${student.id}` }, () => {
        loadData(student);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [student, user]);


  const handleopenModal = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    setNewTitle("");
    setNewStart("09:00");
    setNewEnd("10:00");
    setNewColor("blue");
    setIsModalOpen(true);
  };

  const handleAddBlock = async () => {
    if (!newTitle.trim() || !user || !student) return;

    setIsSaving(true);
    const block: Partial<ScheduleBlock> = {
      studentId: student.id,
      coachId: user.id,
      dayOfWeek: selectedDay,
      startTime: newStart,
      endTime: newEnd,
      title: newTitle,
      color: newColor
    };

    try {
      // In Supabase, inserting one schedule block directly
      // However our saveSchedulesConfig is a bulk replace. Let's just do a specific append query or replace.
      await supabase.from('schedules').insert({
        student_id: block.studentId,
        coach_id: block.coachId,
        day_of_week: block.dayOfWeek,
        start_time: block.startTime,
        end_time: block.endTime,
        title: block.title,
        color: block.color
      });

      setIsModalOpen(false);
      await loadData(student);
    } catch (e) {
       console.error("Error saving schedule block", e);
    } finally {
       setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('schedules').delete().eq('id', id);
      if (student) await loadData(student);
    } catch (e) {
      console.error("error deleting schedule", e);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center p-12 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">Öğrenci bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6">
        <Link href="/coach/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
          <ArrowLeft className="h-4 w-4" /> Öğrencilerime Dön
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {student.name}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Haftalık Program Editörü
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
        {DAYS.map((dayName, dayIndex) => {
          const dayBlocks = schedules
            .filter(s => s.dayOfWeek === dayIndex)
            .sort((a,b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={dayIndex} className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-[400px]">
              <div className="bg-muted/30 p-3 border-b border-border text-center font-semibold text-sm">
                {dayName}
              </div>
              <div className="flex-1 p-3 space-y-2 relative">
                {dayBlocks.map(block => {
                  const colorObj = COLORS.find(c => c.value === block.color) || COLORS[0];
                  return (
                    <div key={block.id} className={`p-3 rounded-lg border flex flex-col gap-2 relative group ${colorObj.class}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm leading-tight pr-4">{block.title}</span>
                        <button 
                          onClick={() => handleDelete(block.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 text-red-500 hover:text-red-700 bg-background/50 rounded-full p-1 -mr-1 -mt-1 focus:outline-none"
                          title="Görevi Sil"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs opacity-80 font-medium">
                        <Clock className="size-3.5" />
                        {block.startTime} - {block.endTime}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border bg-card pt-3 mt-auto">
                <button
                  onClick={() => handleopenModal(dayIndex)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border border-dashed border-border rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Plus className="size-4" /> Ekle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2"><Calendar className="size-5" /> Görev Ekle</h3>
              <div className="px-2 py-1 bg-muted rounded text-xs font-semibold">{DAYS[selectedDay]}</div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ders / Görev Başlığı</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Örn: Matematik Denemesi" 
                  disabled={isSaving}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Başlangıç</label>
                  <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} disabled={isSaving} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bitiş</label>
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} disabled={isSaving} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Renk Kodu</label>
                <div className="flex gap-3">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNewColor(c.value)}
                      disabled={isSaving}
                      className={`size-8 rounded-full border-2 transition-all ${newColor === c.value ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-60 hover:opacity-100"}`}
                      style={{ 
                        backgroundColor: c.value === 'blue' ? '#3b82f6' : 
                                         c.value === 'red' ? '#ef4444' :
                                         c.value === 'emerald' ? '#10b981' :
                                         c.value === 'violet' ? '#8b5cf6' :
                                         c.value === 'amber' ? '#f59e0b' : '#d946ef'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">İptal</button>
              <button 
                onClick={handleAddBlock} 
                disabled={!newTitle.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {isSaving ? "Kaydediliyor..." : "Görevi Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
