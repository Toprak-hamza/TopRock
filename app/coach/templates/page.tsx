"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  getUsers, 
  getCurriculum, 
  CurriculumSubject,
  StudyPlanTemplate, 
  TemplateTaskItem,
  getStudyPlanTemplates, 
  saveStudyPlanTemplate, 
  deleteStudyPlanTemplate,
  applyTemplateToStudent
} from "@/lib/auth";
import { 
  Plus, 
  Search, 
  Loader2, 
  Copy, 
  Trash2, 
  Edit3, 
  Calendar, 
  Target, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  X,
  ChevronRight,
  UserCheck,
  Zap,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TemplatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<StudyPlanTemplate[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumSubject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // Template Form Modal States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StudyPlanTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateTasks, setTemplateTasks] = useState<TemplateTaskItem[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // New Task Input inside Template Form
  const [taskDay, setTaskDay] = useState<number>(1);
  const [taskSubject, setTaskSubject] = useState("");
  const [taskCustomSubject, setTaskCustomSubject] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskTargetQuestions, setTaskTargetQuestions] = useState<number>(40);
  const [taskTargetDuration, setTaskTargetDuration] = useState<number>(2);
  const [taskSourceBook, setTaskSourceBook] = useState("");
  const [taskSubTopic, setTaskSubTopic] = useState("");
  const [taskPageRange, setTaskPageRange] = useState("");
  const [taskCoachNote, setTaskCoachNote] = useState("");

  // Clone Modal States
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedTemplateToClone, setSelectedTemplateToClone] = useState<StudyPlanTemplate | null>(null);
  const [targetStudentId, setTargetStudentId] = useState("");
  const [targetWeekDate, setTargetWeekDate] = useState<string>(() => formatDate(getMonday(new Date())));
  const [clearExistingTasks, setClearExistingTasks] = useState(true);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccessMessage, setCloneSuccessMessage] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [templateToDelete, setTemplateToDelete] = useState<StudyPlanTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const curriculumSubjectNames = curriculum.map(c => c.name);
  const subjectsList = Array.from(new Set([...curriculumSubjectNames, ...POPULAR_SUBJECTS]));

  const loadData = async () => {
    if (!user) return;
    try {
      const [allTemplates, allUsers, curr] = await Promise.all([
        getStudyPlanTemplates(user.id),
        getUsers(),
        getCurriculum()
      ]);

      setTemplates(allTemplates);
      setCurriculum(curr || []);

      const coachStudents = allUsers.filter(u => u.role === "student" && u.coachId === user.id);
      setStudents(coachStudents);
      if (coachStudents.length > 0) {
        setTargetStudentId(coachStudents[0].id);
      }
    } catch (e) {
      console.error("Error loading template page data:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "coach") {
        router.push("/login");
        return;
      }
      loadData();
    } else if (!authLoading && !user) {
      setLoadingData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleOpenCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateDescription("");
    setTemplateTasks([]);
    resetTaskForm();
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplateModal = (template: StudyPlanTemplate) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateDescription(template.description);
    setTemplateTasks(template.scheduleData || []);
    resetTaskForm();
    setIsTemplateModalOpen(true);
  };

  const resetTaskForm = () => {
    setTaskDay(1);
    setTaskSubject(subjectsList[0] || "Matematik");
    setTaskCustomSubject("");
    setTaskDescription("");
    setTaskTargetQuestions(40);
    setTaskTargetDuration(2);
    setTaskSourceBook("");
    setTaskSubTopic("");
    setTaskPageRange("");
    setTaskCoachNote("");
  };

  const handleAddTaskToTemplate = () => {
    const finalSubject = taskSubject === "Diğer" ? taskCustomSubject.trim() : taskSubject;
    if (!finalSubject) {
      alert("Lütfen bir ders seçin veya özel ders adı girin.");
      return;
    }
    if (!taskDescription.trim()) {
      alert("Lütfen görev açıklamasını girin.");
      return;
    }

    const newTask: TemplateTaskItem = {
      dayOfWeek: taskDay,
      subject: finalSubject,
      description: taskDescription.trim(),
      targetQuestions: Number(taskTargetQuestions) || 0,
      targetDuration: Number(taskTargetDuration) || 0,
      sourceBook: taskSourceBook.trim(),
      subTopic: taskSubTopic.trim(),
      pageRange: taskPageRange.trim(),
      coachNote: taskCoachNote.trim()
    };

    setTemplateTasks(prev => [...prev, newTask]);
    
    // Reset description and notes for quick entry of next task
    setTaskDescription("");
    setTaskSubTopic("");
    setTaskCoachNote("");
  };

  const handleRemoveTaskFromTemplate = (index: number) => {
    setTemplateTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !templateTitle.trim()) {
      alert("Lütfen şablon başlığını yazın.");
      return;
    }
    if (templateTasks.length === 0) {
      alert("Şablon oluşturabilmek için en az 1 adet günlük görev eklemelisiniz.");
      return;
    }

    setIsSavingTemplate(true);
    try {
      await saveStudyPlanTemplate({
        id: editingTemplate?.id,
        coachId: user.id,
        title: templateTitle.trim(),
        description: templateDescription.trim(),
        scheduleData: templateTasks
      });

      setIsTemplateModalOpen(false);
      await loadData();
    } catch (e) {
      console.error("Error saving template:", e);
      alert("Şablon kaydedilirken bir hata oluştu.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteStudyPlanTemplate(templateToDelete.id);
      setTemplateToDelete(null);
      await loadData();
    } catch (e) {
      console.error("Error deleting template:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCloneModal = (template: StudyPlanTemplate) => {
    setSelectedTemplateToClone(template);
    setCloneSuccessMessage(null);
    setIsCloneModalOpen(true);
  };

  const handleExecuteClone = async () => {
    if (!user || !selectedTemplateToClone || !targetStudentId) return;

    setIsCloning(true);
    setCloneSuccessMessage(null);
    try {
      await applyTemplateToStudent(
        selectedTemplateToClone.id,
        targetStudentId,
        user.id,
        targetWeekDate,
        clearExistingTasks
      );

      const targetStudentObj = students.find(s => s.id === targetStudentId);
      setCloneSuccessMessage(`"${selectedTemplateToClone.title}" şablonu, ${targetStudentObj?.name || 'öğrenciye'} başarıyla uygulandı!`);
      
      setTimeout(() => {
        setIsCloneModalOpen(false);
        setCloneSuccessMessage(null);
      }, 1800);
    } catch (e: any) {
      console.error("Error cloning template to student:", e);
      alert(e.message || "Şablon kopyalanırken hata oluştu.");
    } finally {
      setIsCloning(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Hazır Şablon Planlar
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Sparkles className="size-3" /> Koça Özel
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Öğrencilerinize tek tıkla uygulayabileceğiniz kişisel çalışma programı şablonlarınızı yönetin ve klonlayın.
          </p>
        </div>

        <button
          onClick={handleOpenCreateTemplateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" /> Yeni Şablon Oluştur
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-4 bg-card border border-border/60 rounded-xl p-2.5 max-w-md shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <input
          type="text"
          placeholder="Şablon başlığı veya açıklamalarında ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 py-20 text-center">
          <div className="rounded-full bg-purple-500/10 p-5 mb-4 text-purple-600 dark:text-purple-400">
            <Copy className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-bold mb-1">Şablon Bulunamadı</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Henüz oluşturulmuş hazır şablon planınız yok. Sıfırdan bir haftalık şablon oluşturup istediğiniz zaman öğrencilerinize tek tıkla kopyalayabilirsiniz.
          </p>
          <button
            onClick={handleOpenCreateTemplateModal}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" /> İlk Şablonunu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => {
            const totalTasks = template.scheduleData.length;
            const totalQuestions = template.scheduleData.reduce((sum, item) => sum + (item.targetQuestions || 0), 0);
            const totalPomo = template.scheduleData.reduce((sum, item) => sum + (item.targetDuration || 0), 0);

            return (
              <div 
                key={template.id}
                className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-purple-500/30 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {template.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditTemplateModal(template)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors hover:bg-muted"
                        title="Şablonu Düzenle"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(template)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md transition-colors hover:bg-muted"
                        title="Şablonu Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {template.description}
                    </p>
                  )}

                  {/* Badges Summary */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="rounded-lg bg-muted/40 p-2 text-center border border-border/40">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Toplam Görev</span>
                      <span className="text-sm font-black text-foreground">{totalTasks}</span>
                    </div>
                    <div className="rounded-lg bg-red-500/5 p-2 text-center border border-red-500/10">
                      <span className="text-[10px] font-bold text-red-500 uppercase block">Hedef Soru</span>
                      <span className="text-sm font-black text-red-600 dark:text-red-400">{totalQuestions}</span>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 p-2 text-center border border-amber-500/10">
                      <span className="text-[10px] font-bold text-amber-500 uppercase block">Hedef Pomo</span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400">{totalPomo}</span>
                    </div>
                  </div>

                  {/* Day breakdown preview */}
                  <div className="space-y-1.5 mb-6 border-t border-border/40 pt-4">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Günlük Görev Dağılımı</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map(d => {
                        const count = template.scheduleData.filter(item => item.dayOfWeek === d.value).length;
                        if (count === 0) return null;
                        return (
                          <span 
                            key={d.value} 
                            className="text-[10px] font-semibold px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20"
                          >
                            {d.label.slice(0, 3)}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Primary Action: Clone to Student */}
                <button
                  onClick={() => handleOpenCloneModal(template)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-95"
                >
                  <Copy className="size-4" /> Öğrenciye Klonla
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-3xl rounded-2xl shadow-2xl border border-border my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-border/60 px-6 py-4 flex justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2">
                <Copy className="size-5 text-purple-500" />
                <h3 className="font-bold text-foreground">
                  {editingTemplate ? "Şablon Planı Düzenle" : "Yeni Hazır Şablon Plan Oluştur"}
                </h3>
              </div>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                disabled={isSavingTemplate}
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-6">
              {/* Template Meta Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Şablon Başlığı *</label>
                  <input
                    type="text"
                    required
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: YKS Sayısal Yoğun Matematik Kampı"
                    disabled={isSavingTemplate}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Şablon Açıklaması (Opsiyonel)</label>
                  <input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: 12. Sınıf ve mezunlar için türev/integral ağırlıklı 1 haftalık şablon."
                    disabled={isSavingTemplate}
                  />
                </div>
              </div>

              {/* Task Add Form inside Template */}
              <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="size-4" /> Şablona Yeni Görev Ekle
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Gün</label>
                    <select
                      value={taskDay}
                      onChange={(e) => setTaskDay(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary outline-none"
                    >
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Ders</label>
                    <select
                      value={taskSubject}
                      onChange={(e) => setTaskSubject(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary outline-none"
                    >
                      {subjectsList.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="Diğer">Diğer (Özel)</option>
                    </select>
                  </div>

                  {taskSubject === "Diğer" && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-muted-foreground">Özel Ders Adı</label>
                      <input
                        type="text"
                        value={taskCustomSubject}
                        onChange={(e) => setTaskCustomSubject(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                        placeholder="Ders adını yazın..."
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Hedef Soru</label>
                    <input
                      type="number"
                      min="0"
                      value={taskTargetQuestions}
                      onChange={(e) => setTaskTargetQuestions(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Hedef Pomo</label>
                    <input
                      type="number"
                      min="0"
                      value={taskTargetDuration}
                      onChange={(e) => setTaskTargetDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Alt Konu</label>
                    <input
                      type="text"
                      value={taskSubTopic}
                      onChange={(e) => setTaskSubTopic(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                      placeholder="Örn: Limit & Süreklilik"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Kaynak Kitap</label>
                    <input
                      type="text"
                      value={taskSourceBook}
                      onChange={(e) => setTaskSourceBook(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                      placeholder="Örn: Bilgi Sarmal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">Sayfa Aralığı</label>
                    <input
                      type="text"
                      value={taskPageRange}
                      onChange={(e) => setTaskPageRange(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                      placeholder="Örn: 45-60"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground">Görev Açıklaması *</label>
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
                    placeholder="Örn: Test 1-4 çözülecek, yapamadıkların soru havuzuna atılacak."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddTaskToTemplate}
                    className="flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                  >
                    <Plus className="size-4" /> Şablona Görevi Ekle
                  </button>
                </div>
              </div>

              {/* Added Tasks List Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Şablonun Görev Listesi ({templateTasks.length} Görev)
                  </h4>
                  {templateTasks.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setTemplateTasks([])} 
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Tümünü Temizle
                    </button>
                  )}
                </div>

                {templateTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6 border border-dashed border-border/60 rounded-xl">
                    Henüz şablona görev eklenmedi. Yukarıdaki formdan ekleyebilirsiniz.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {templateTasks.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10 text-xs gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded shrink-0">
                            {DAYS_OF_WEEK.find(d => d.value === t.dayOfWeek)?.label}
                          </span>
                          <span className="font-bold text-foreground shrink-0">{t.subject}</span>
                          <span className="text-muted-foreground truncate">{t.description}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-muted-foreground font-semibold">
                            {t.targetQuestions > 0 && `${t.targetQuestions} Soru `}
                            {t.targetDuration > 0 && `${t.targetDuration} Pomo`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskFromTemplate(idx)}
                            className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  disabled={isSavingTemplate}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSavingTemplate && <Loader2 className="size-4 animate-spin" />}
                  {isSavingTemplate ? "Kaydediliyor..." : "Şablonu Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLONE TO STUDENT MODAL */}
      {isCloneModalOpen && selectedTemplateToClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Copy className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Öğrenciye Program Klonla</h3>
                  <p className="text-xs text-muted-foreground">&quot;{selectedTemplateToClone.title}&quot;</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCloneModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                disabled={isCloning}
              >
                <X className="size-5" />
              </button>
            </div>

            {cloneSuccessMessage ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <CheckCircle2 className="size-12 text-emerald-500 animate-bounce" />
                <h4 className="text-lg font-bold text-foreground">İşlem Tamamlandı!</h4>
                <p className="text-sm text-muted-foreground">{cloneSuccessMessage}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Select Student */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Hedef Öğrenci Seçin *</label>
                  {students.length === 0 ? (
                    <p className="text-xs text-red-500 border border-red-500/20 bg-red-500/5 p-3 rounded-lg">
                      Sisteme kayıtlı aktif öğrenciniz bulunmuyor. Önce öğrenci eklemelisiniz.
                    </p>
                  ) : (
                    <select
                      value={targetStudentId}
                      onChange={(e) => setTargetStudentId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none"
                      disabled={isCloning}
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Target Week Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Uygulanacak Hafta Başlangıcı (Pazartesi) *</label>
                  <input
                    type="date"
                    required
                    value={targetWeekDate}
                    onChange={(e) => setTargetWeekDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary outline-none"
                    disabled={isCloning}
                  />
                </div>

                {/* Options: Clear or Append */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <label className="text-xs font-bold text-muted-foreground block">Mevcut Görev Çakışma Yönetimi</label>
                  
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/10 cursor-pointer transition-colors hover:bg-muted/20">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={clearExistingTasks}
                      onChange={() => setClearExistingTasks(true)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Öğrencinin O Haftadaki Eski Görevlerini Sıfırla (Önerilen)</span>
                      <span className="text-muted-foreground">Şablon görevleri temiz bir sayfaya tamamen yeni program olarak yazılır.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/10 cursor-pointer transition-colors hover:bg-muted/20">
                    <input
                      type="radio"
                      name="clearOption"
                      checked={!clearExistingTasks}
                      onChange={() => setClearExistingTasks(false)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Mevcut Görevlerin Üzerine Ekle (Birleştir)</span>
                      <span className="text-muted-foreground">Öğrencinin seçili haftadaki var olan görevleri korunur, şablon görevleri eklenir.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsCloneModalOpen(false)}
                    disabled={isCloning}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteClone}
                    disabled={isCloning || students.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-700 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isCloning && <Loader2 className="size-4 animate-spin" />}
                    {isCloning ? "Klonlanıyor..." : "Tek Tıkla Klonla"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="p-4 bg-red-500/10 text-red-500 rounded-full">
                <AlertTriangle className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Şablonu Sil</h3>
              <p className="text-sm text-muted-foreground">
                &quot;<strong>{templateToDelete.title}</strong>&quot; isimli şablonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setTemplateToDelete(null)} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors border border-transparent"
              >
                İptal
              </button>
              <button 
                onClick={handleDeleteTemplate} 
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
