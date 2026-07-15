"use client";

import { useEffect, useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Target, 
  X,
  BookOpen
} from "lucide-react";
import { 
  WeeklyProgram, 
  DailyTask, 
  getOrCreateWeeklyProgram, 
  getDailyTasks, 
  saveDailyTask, 
  deleteDailyTask,
  getCurriculum,
  CurriculumSubject
} from "@/lib/auth";
import { cn } from "@/lib/utils";

interface WeeklyProgramEditorProps {
  studentId: string;
  coachId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 7, label: "Pazar" }
];

const POPULAR_SUBJECTS = [
  "Matematik",
  "Geometri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Paragraf",
  "Genel Deneme"
];

export function WeeklyProgramEditor({ studentId, coachId }: WeeklyProgramEditorProps) {
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [program, setProgram] = useState<WeeklyProgram | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  
  // Form states
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>([]);
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [description, setDescription] = useState("");
  const [targetQuestions, setTargetQuestions] = useState<number>(0);
  const [targetDuration, setTargetDuration] = useState<number>(0);
  const [sourceBook, setSourceBook] = useState("");
  const [subTopic, setSubTopic] = useState("");
  const [pageRange, setPageRange] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [subTopicMode, setSubTopicMode] = useState<"select" | "custom">("custom");
  const [selectedTopicDropdown, setSelectedTopicDropdown] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Combine curriculum subjects with popular ones dynamically
  const curriculumSubjectNames = curriculum.map(c => c.name);
  const subjectsList = Array.from(new Set([...curriculumSubjectNames, ...POPULAR_SUBJECTS]));

  // Helper: Get Monday of a week
  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(date.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  // Format date to YYYY-MM-DD
  function formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Display week label (e.g., "12 Tem - 18 Tem 2026")
  function getWeekLabel(): string {
    const start = new Date(currentWeekMonday);
    const end = new Date(currentWeekMonday);
    end.setDate(end.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startStr = start.toLocaleDateString('tr-TR', options);
    const endStr = end.toLocaleDateString('tr-TR', { ...options, year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  }

  const loadProgramData = async () => {
    setLoading(true);
    try {
      const weekStr = formatDate(currentWeekMonday);
      const prog = await getOrCreateWeeklyProgram(studentId, coachId, weekStr);
      setProgram(prog);

      const allTasks = await getDailyTasks(prog.id);
      setTasks(allTasks);

      // Load custom curriculum
      const curr = await getCurriculum();
      setCurriculum(curr || []);
    } catch (e) {
      console.error("Error loading program tasks/curriculum:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgramData();
  }, [currentWeekMonday, studentId, coachId]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekMonday);
    next.setDate(next.getDate() + 7);
    setCurrentWeekMonday(next);
  };

  const handleOpenAddModal = (day: number) => {
    setEditingTask(null);
    setSelectedDay(day);
    
    const initialSubject = subjectsList[0] || POPULAR_SUBJECTS[0];
    setSubject(initialSubject);
    setCustomSubject("");
    setDescription("");
    setTargetQuestions(40);
    setTargetDuration(2); // Default to 2 Pomodoros / 50 mins
    setSourceBook("");
    setPageRange("");
    setCoachNote("");

    // Determine subtopic options from curriculum
    const matchedCurr = curriculum.find(c => c.name === initialSubject);
    const topics = matchedCurr ? matchedCurr.topics : [];
    if (topics.length > 0) {
      setSubTopicMode("select");
      setSelectedTopicDropdown(topics[0]);
      setSubTopic(topics[0]);
    } else {
      setSubTopicMode("custom");
      setSelectedTopicDropdown("Diğer");
      setSubTopic("");
    }

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: DailyTask) => {
    setEditingTask(task);
    setSelectedDay(task.dayOfWeek);
    
    if (subjectsList.includes(task.subject)) {
      setSubject(task.subject);
      setCustomSubject("");
    } else {
      setSubject("Diğer");
      setCustomSubject(task.subject);
    }
    
    setDescription(task.description);
    setTargetQuestions(task.targetQuestions);
    setTargetDuration(task.targetDuration);
    setSourceBook(task.sourceBook || "");
    setPageRange(task.pageRange || "");
    setCoachNote(task.coachNote || "");

    // Determine subtopic selection
    const finalSubjectName = subjectsList.includes(task.subject) ? task.subject : "Diğer";
    const matchedCurr = curriculum.find(c => c.name === finalSubjectName);
    const topics = matchedCurr ? matchedCurr.topics : [];
    if (task.subTopic && topics.includes(task.subTopic)) {
      setSubTopicMode("select");
      setSelectedTopicDropdown(task.subTopic);
      setSubTopic(task.subTopic);
    } else {
      setSubTopicMode("custom");
      setSelectedTopicDropdown("Diğer");
      setSubTopic(task.subTopic || "");
    }

    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bu görevi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDailyTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;
    setSubmitting(true);

    const finalSubject = subject === "Diğer" ? customSubject.trim() : subject;
    if (!finalSubject) {
      alert("Lütfen ders adını girin veya seçin.");
      setSubmitting(false);
      return;
    }

    try {
      const taskData: Partial<DailyTask> = {
        id: editingTask?.id,
        programId: program.id,
        dayOfWeek: selectedDay,
        subject: finalSubject,
        description: description.trim(),
        targetQuestions: Number(targetQuestions) || 0,
        targetDuration: Number(targetDuration) || 0,
        isCompleted: editingTask ? editingTask.isCompleted : false,
        sourceBook: sourceBook.trim(),
        subTopic: subTopic.trim(),
        pageRange: pageRange.trim(),
        coachNote: coachNote.trim()
      };

      await saveDailyTask(taskData);
      setIsModalOpen(false);
      await loadProgramData();
    } catch (e) {
      console.error("Error saving task:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const getSubjectColor = (sub: string) => {
    switch (sub) {
      case "Matematik":
      case "Geometri":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Fizik":
      case "Kimya":
      case "Biyoloji":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Türkçe":
      case "Edebiyat":
      case "Paragraf":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Tarih":
      case "Coğrafya":
      case "Felsefe":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-primary" />
          <span className="font-bold text-foreground">{getWeekLabel()}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrevWeek}
            className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-muted text-foreground transition-all active:scale-95"
            title="Önceki Hafta"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setCurrentWeekMonday(getMonday(new Date()))}
            className="px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-muted text-xs font-semibold text-foreground transition-all active:scale-95"
          >
            Bu Hafta
          </button>
          <button
            onClick={handleNextWeek}
            className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-muted text-foreground transition-all active:scale-95"
            title="Sonraki Hafta"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayTasks = tasks.filter(t => t.dayOfWeek === day.value);
            return (
              <div 
                key={day.value}
                className="flex flex-col rounded-xl border border-border/80 bg-card/50 min-h-[300px] overflow-hidden shadow-sm"
              >
                {/* Day Header */}
                <div className="bg-muted/40 px-4 py-3 border-b border-border/60 flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground/80 tracking-wide uppercase">{day.label}</span>
                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {dayTasks.length}
                  </span>
                </div>

                {/* Task List */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[400px]">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id}
                      className={cn(
                        "group border rounded-lg p-3 space-y-2 relative transition-all hover:shadow-sm",
                        task.isCompleted 
                          ? "border-emerald-500/20 bg-emerald-500/5 text-muted-foreground" 
                          : "border-border/60 bg-background"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider",
                          getSubjectColor(task.subject)
                        )}>
                          {task.subject}
                        </span>
                        
                        {/* Action buttons visible on hover */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Görevi Düzenle"
                          >
                            <Edit2 className="size-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                            title="Görevi Sil"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed font-medium text-foreground line-clamp-3">
                        {task.description}
                      </p>

                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground pt-1 border-t border-border/30">
                        {task.targetQuestions > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Target className="size-3 text-red-500" /> {task.targetQuestions} Soru
                          </span>
                        )}
                        {task.targetDuration > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="size-3 text-amber-500" /> {task.targetDuration} Pomo
                          </span>
                        )}
                        {task.isCompleted && (
                          <span className="flex items-center gap-0.5 text-emerald-500 ml-auto">
                            <CheckCircle className="size-3" /> Bitti
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {dayTasks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-8 opacity-40 text-center text-[11px]">
                      <BookOpen className="size-5 mb-1 text-muted-foreground" />
                      <span>Boş Gün</span>
                    </div>
                  )}
                </div>

                {/* Add button */}
                <div className="p-2 bg-muted/10 border-t border-border/40">
                  <button
                    onClick={() => handleOpenAddModal(day.value)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all active:scale-[0.98]"
                  >
                    <Plus className="size-3.5" /> Görev Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal (Add & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-border/50 px-6 py-4 flex justify-between items-center bg-muted/10">
              <h3 className="text-sm font-bold text-foreground">
                {editingTask ? "Görevi Düzenle" : `${DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label} Gününe Görev Ekle`}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                disabled={submitting}
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Ders / Konu Grubu</label>
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setSubject(newSub);
                    const matchedCurr = curriculum.find(c => c.name === newSub);
                    const topics = matchedCurr ? matchedCurr.topics : [];
                    if (topics.length > 0) {
                      setSelectedTopicDropdown(topics[0]);
                      setSubTopic(topics[0]);
                    } else {
                      setSelectedTopicDropdown("Diğer");
                      setSubTopic("");
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  disabled={submitting}
                >
                  {subjectsList.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="Diğer">Diğer (Özel yaz)</option>
                </select>
              </div>

              {subject === "Diğer" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-muted-foreground">Özel Ders Adı</label>
                  <input
                    type="text"
                    required
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Ders adını yazın..."
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Alt Konu Başlığı</label>
                  {(() => {
                    const activeCurriculumSubject = curriculum.find(c => c.name === (subject === "Diğer" ? customSubject : subject));
                    const subjectTopics = activeCurriculumSubject ? activeCurriculumSubject.topics : [];
                    
                    if (subjectTopics.length > 0) {
                      return (
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={selectedTopicDropdown}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedTopicDropdown(val);
                              if (val !== "Diğer") {
                                setSubTopic(val);
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            disabled={submitting}
                          >
                            {subjectTopics.map(topic => (
                              <option key={topic} value={topic}>{topic}</option>
                            ))}
                            <option value="Diğer">Diğer (Özel yaz)</option>
                          </select>
                          {selectedTopicDropdown === "Diğer" && (
                            <input
                              type="text"
                              value={subTopic}
                              onChange={(e) => setSubTopic(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mt-1"
                              placeholder="Özel alt konu adı..."
                              disabled={submitting}
                            />
                          )}
                        </div>
                      );
                    }

                    return (
                      <input
                        type="text"
                        value={subTopic}
                        onChange={(e) => setSubTopic(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Örn: Parabol grafikleri"
                        disabled={submitting}
                      />
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Kaynak Kitap</label>
                  <input
                    type="text"
                    value={sourceBook}
                    onChange={(e) => setSourceBook(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: 3D Soru Bankası"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Sayfa Aralığı</label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: 12-25"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Hedef Soru</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={targetQuestions}
                    onChange={(e) => setTargetQuestions(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Hedef Pomo</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Görev Açıklaması</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Yapılacakları detaylandırın..."
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Koçun Özel Notu / Motivasyon</label>
                <textarea
                  rows={2}
                  value={coachNote}
                  onChange={(e) => setCoachNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Öğrenciye özel mesaj, ipucu veya motivasyon..."
                  disabled={submitting}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
