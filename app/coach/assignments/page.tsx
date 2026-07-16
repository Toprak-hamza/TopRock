"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef } from "react";
import { User, Homework, getUsers, getHomeworks, saveHomework, getLibraryBooks, getLibraryTopics, LibraryBook, LibraryTopic, CurriculumSubject, getCurriculum, getGroups, getGroupMembers, Group, GroupMember } from "@/lib/auth";
import { Plus, ListChecks, Calendar, AlertTriangle, AlertCircle, Trash2, Loader2, Book, ChevronDown, Check, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function CoachAssignmentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<User[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFilterStudentId, setSelectedFilterStudentId] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Form State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [questionCount, setQuestionCount] = useState<number | "">("");

  // Combobox State
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  // Groups State
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Library State
  const [formMode, setFormMode] = useState<"custom" | "library">("custom");
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [libraryTopics, setLibraryTopics] = useState<LibraryTopic[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const loadData = async () => {
    if (!user) return;
    setIsDataLoading(true);
    try {
      const allUsers = await getUsers();
      const coachStudents = allUsers.filter(u => u.role === "student" && u.coachId === user.id);
      setStudents(coachStudents);

      const allGroups = await getGroups();
      setGroups(allGroups.filter(g => g.coachId === user.id));

      const allMembers = await getGroupMembers();
      setGroupMembers(allMembers);

      if (coachStudents.length > 0 && selectedStudentIds.length === 0) {
        setSelectedStudentIds([coachStudents[0].id]);
      }

      const allHWs = await getHomeworks();
      setHomeworks(allHWs.filter(hw => hw.coachId === user.id));

      const books = await getLibraryBooks();
      setLibraryBooks(books);

      const subjects = await getCurriculum();
      setCurriculumSubjects(subjects);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsDataLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Realtime
  useEffect(() => {
    if (selectedBookId) {
      getLibraryTopics(selectedBookId).then(setLibraryTopics);
      setSelectedTopicIds([]);
    } else {
      setLibraryTopics([]);
    }
  }, [selectedBookId]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('coach_homework_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homeworks', filter: `coach_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedStudentIds.length === 0 || !dueDate) return;

    if (formMode === "custom" && (!subject.trim() || !description.trim())) return;
    if (formMode === "library" && selectedTopicIds.length === 0) return;

    setIsSaving(true);
    try {
      for (const sId of selectedStudentIds) {
        if (formMode === "custom") {
          const newHW: Partial<Homework> = {
            studentId: sId,
            coachId: user.id,
            subject: subject.trim(),
            description: description.trim(),
            dueDate,
            priority,
            questionCount: typeof questionCount === 'number' ? questionCount : undefined,
            completed: false
          };
          await saveHomework(newHW);
        } else {
          const book = libraryBooks.find(b => b.id === selectedBookId);
          const selectedTopics = libraryTopics.filter(t => selectedTopicIds.includes(t.id));
          
          for (const topic of selectedTopics) {
            const newHW: Partial<Homework> = {
              studentId: sId,
              coachId: user.id,
              subject: `${book?.name || 'Kütüphane'} - ${topic.name}`,
              description: `Kitap: ${book?.name || 'Bilinmeyen Kitap'}\nKonu: ${topic.name}\n${topic.page_range ? `Sayfa: ${topic.page_range}` : ''}`,
              dueDate,
              priority,
              questionCount: typeof questionCount === 'number' ? questionCount : undefined,
              completed: false
            };
            await saveHomework(newHW);
          }
        }
      }

      setSubject("");
      setDescription("");
      setSelectedTopicIds([]);
      setDueDate("");
      setPriority("medium");
      setQuestionCount("");
      await loadData();
    } catch (e) {
      console.error("Error saving homework:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (hwId: string) => {
    try {
      await supabase.from('homeworks').delete().eq('id', hwId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "medium": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "low": return "text-green-500 bg-green-500/10 border-green-500/20";
      default: return "";
    }
  };

  const getPriorityLabel = (p: string) => {
    switch (p) {
      case "high": return "Yüksek";
      case "medium": return "Orta";
      case "low": return "Düşük";
      default: return "";
    }
  };

  if (authLoading || isDataLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ödevlendirme</h1>
        <p className="text-muted-foreground text-sm mt-1">Öğrencilerinize görevler atayın ve takiplerini yapın.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
            <Plus className="size-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Yeni Ödev Ata</h2>
          </div>

          {students.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">Sisteme kayıtlı öğrenciniz bulunmuyor. Önce öğrenci davet etmelisiniz.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Öğrenci Seç {selectedStudentIds.length > 0 && <span className="text-xs text-primary font-bold ml-1">({selectedStudentIds.length})</span>}</span>
                  {groups.length > 0 && (
                    <span className="text-xs text-muted-foreground">Veya sınıf ekle:</span>
                  )}
                </label>
                
                <div className="relative">
                  <div 
                    onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                    className="min-h-[42px] w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus-within:border-primary focus-within:ring-1 focus-within:ring-primary cursor-pointer flex flex-wrap gap-2 items-center"
                  >
                    {selectedStudentIds.length === 0 && (
                      <span className="text-muted-foreground/70 py-0.5">Öğrenci seçiniz...</span>
                    )}
                    {students.filter(s => selectedStudentIds.includes(s.id)).map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-xs font-medium">
                        {s.name}
                        <X className="size-3 cursor-pointer hover:text-primary/70 transition-colors" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                        }} />
                      </span>
                    ))}
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>

                  <AnimatePresence>
                    {isStudentDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg z-50 p-1"
                      >
                        {students.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground text-center">Öğrenci bulunamadı.</div>
                        ) : (
                          students.map(s => {
                            const isSelected = selectedStudentIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm transition-colors ${isSelected ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted"}`}
                                onClick={() => {
                                  setSelectedStudentIds(prev =>
                                    prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                  );
                                }}
                              >
                                <span>{s.name} <span className="text-xs opacity-60 ml-1">({s.email})</span></span>
                                {isSelected && <Check className="size-4 text-primary" />}
                              </button>
                            )
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {groups.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {groups.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          const groupStudentIds = groupMembers.filter(m => m.groupId === g.id).map(m => m.studentId);
                          const newIds = groupStudentIds.filter(id => !selectedStudentIds.includes(id) && students.find(s => s.id === id));
                          if (newIds.length > 0) {
                            setSelectedStudentIds(prev => [...prev, ...newIds]);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-colors"
                      >
                        <Users className="size-3" /> {g.name} Ekle
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-muted/50 rounded-lg border border-border w-full">
                <button
                  type="button"
                  onClick={() => setFormMode("custom")}
                  className={`flex-1 py-1.5 px-2 min-w-0 text-xs sm:text-sm font-medium rounded-md transition-colors truncate ${formMode === "custom" ? "bg-background shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Manuel Ödev
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode("library")}
                  className={`flex-1 py-1.5 px-2 min-w-0 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate ${formMode === "library" ? "bg-background shadow-sm border border-border text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Book className="size-3.5 shrink-0" /> <span className="truncate">Kütüphaneden Seç</span>
                </button>
              </div>

              {formMode === "custom" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                      <label className="text-sm font-medium text-muted-foreground">Ders Başlığı</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          disabled={isSaving}
                          value={subject}
                          onChange={(e) => {
                            setSubject(e.target.value);
                            setIsComboboxOpen(true);
                          }}
                          onFocus={() => setIsComboboxOpen(true)}
                          onBlur={() => setTimeout(() => setIsComboboxOpen(false), 200)}
                          placeholder="Ders Seç veya Yaz..."
                          className="w-full rounded-lg border border-border bg-background px-4 py-2 pr-10 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        
                        <AnimatePresence>
                          {isComboboxOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg z-50 p-1"
                            >
                              {curriculumSubjects.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground italic">Kayıtlı ders bulunamadı.</div>
                              ) : (
                                curriculumSubjects
                                  .filter(cs => cs.name.toLowerCase().includes(subject.toLowerCase()))
                                  .map((cs, i, arr) => (
                                    <button
                                      key={cs.id}
                                      type="button"
                                      className="w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                                      onClick={() => {
                                        setSubject(cs.name);
                                        setIsComboboxOpen(false);
                                      }}
                                    >
                                      {cs.name}
                                    </button>
                                  ))
                              )}
                              {subject && curriculumSubjects.filter(cs => cs.name.toLowerCase() === subject.toLowerCase()).length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border mt-1 pt-1 opacity-70">
                                  &quot;{subject}&quot; yeni giriş olarak kaydedilecek
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Teslim Tarihi</label>
                      <input
                        type="date"
                        required
                        disabled={isSaving}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Ödev Açıklaması</label>
                    <textarea
                      required
                      disabled={isSaving}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Çözülecek testler, çalışılacak konu başlıkları vb..."
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Kitap Seç</label>
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      required
                      disabled={isSaving}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="" disabled>Bir kitap seçin...</option>
                      {libraryBooks.map(b => (
                        <option key={b.id} value={b.id}>{b.name} {b.publisher ? `(${b.publisher})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {libraryTopics.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Konuları Seç (Çoklu)</label>
                      <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 bg-muted/10 space-y-1">
                        {libraryTopics.map(topic => (
                          <label key={topic.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedTopicIds.includes(topic.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTopicIds(prev => [...prev, topic.id]);
                                } else {
                                  setSelectedTopicIds(prev => prev.filter(id => id !== topic.id));
                                }
                              }}
                              className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{topic.name}</span>
                              {topic.page_range && <span className="text-xs text-muted-foreground">Sayfa: {topic.page_range}</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Teslim Tarihi</label>
                    <input
                      type="date"
                      required
                      disabled={isSaving}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Öncelik Seviyesi</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {(["low", "medium", "high"] as const).map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={p}
                          checked={priority === p}
                          onChange={() => setPriority(p)}
                          disabled={isSaving}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm capitalize">{getPriorityLabel(p)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    Hedeflenen Soru Sayısı <span className="text-xs text-muted-foreground/50">(Opsiyonel)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={isSaving}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Örn: 50"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 mt-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />} 
                {isSaving ? "Kaydediliyor..." : "Ödevi Gönder"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm flex flex-col h-[600px] relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-accent" />
              <h2 className="text-lg font-semibold tracking-tight">Atanmış Ödevler</h2>
            </div>

            {/* Arama Yapılabilir Öğrenci Filtresi */}
            <div ref={filterDropdownRef} className="relative flex items-center gap-2 z-30">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Öğrenci:
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-all focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px] max-w-[160px] text-left"
                >
                  <span className="truncate">
                    {selectedFilterStudentId 
                      ? (students.find(s => s.id === selectedFilterStudentId)?.name || "Seçildi") 
                      : "Tümü"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                </button>

                <AnimatePresence>
                  {isFilterDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 mt-1 w-56 max-h-60 overflow-hidden rounded-lg border border-border bg-card shadow-lg z-50 flex flex-col p-1"
                    >
                      {/* Arama Kutusu */}
                      <div className="p-1 border-b border-border/50">
                        <input
                          type="text"
                          placeholder="Öğrenci ara..."
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Liste */}
                      <div className="overflow-y-auto max-h-40 p-0.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterStudentId("");
                            setIsFilterDropdownOpen(false);
                            setFilterSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${!selectedFilterStudentId ? "bg-primary/10 font-bold text-primary" : "text-foreground hover:bg-muted"}`}
                        >
                          <span>Tümü</span>
                          {!selectedFilterStudentId && <Check className="size-3.5" />}
                        </button>

                        {students
                          .filter(s => s.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map(s => {
                            const isSelected = selectedFilterStudentId === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedFilterStudentId(s.id);
                                  setIsFilterDropdownOpen(false);
                                  setFilterSearchQuery("");
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${isSelected ? "bg-primary/10 font-bold text-primary" : "text-foreground hover:bg-muted"}`}
                              >
                                <span className="truncate">{s.name}</span>
                                {isSelected && <Check className="size-3.5" />}
                              </button>
                            );
                          })}

                        {students.filter(s => s.name.toLowerCase().includes(filterSearchQuery.toLowerCase())).length === 0 && (
                          <div className="px-2.5 py-2 text-xs text-muted-foreground text-center italic">
                            Eşleşen öğrenci bulunamadı.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {homeworks.filter(hw => !selectedFilterStudentId || hw.studentId === selectedFilterStudentId).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-48 opacity-50">
                <ListChecks className="size-10 mb-2" />
                <p className="text-sm">
                  {selectedFilterStudentId 
                    ? "Seçilen öğrenciye ait ödev bulunmuyor." 
                    : "Henüz bir ödev atamadınız."}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {homeworks
                  .filter(hw => !selectedFilterStudentId || hw.studentId === selectedFilterStudentId)
                  .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(hw => {
                  const studentName = students.find(s => s.id === hw.studentId)?.name || "Bilinmiyor";
                  
                  const isChampion = hw.completed && hw.correctCount !== undefined && hw.incorrectCount !== undefined && hw.emptyCount !== undefined && 
                    (hw.correctCount + hw.incorrectCount + hw.emptyCount > 0) &&
                    (hw.correctCount / (hw.correctCount + hw.incorrectCount + hw.emptyCount) >= 0.9);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={hw.id}
                      className={`p-4 rounded-xl border relative transition-all overflow-hidden group ${
                        isChampion ? "border-amber-500/60 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : 
                        hw.completed ? "border-emerald-500/30 bg-emerald-500/5 opacity-75" : "border-border/80 bg-muted/20"
                      }`}
                    >
                      <button 
                        onClick={() => handleDelete(hw.id)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors bg-background/50 hover:bg-red-500/10 p-1.5 rounded-md focus:outline-none"
                        title="Ödevi Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2 pr-8">
                        {isChampion && (
                           <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/20 text-amber-600 shadow-sm animate-pulse-slow">
                              ⭐ Şampiyon
                           </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {studentName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(hw.priority)}`}>
                          {getPriorityLabel(hw.priority)}
                        </span>
                        {hw.completed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                            Tamamlandı
                          </span>
                        )}
                      </div>
                      
                      <h3 className={`font-medium ${hw.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {hw.subject}
                      </h3>
                      <p className={`text-sm mt-1 whitespace-pre-wrap ${hw.completed ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                        {hw.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                          <AlertCircle className="size-3.5" /> Son Teslim: {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
                        </div>
                        {hw.questionCount && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                            Hedef: {hw.questionCount} Soru
                          </div>
                        )}
                        {hw.completed && hw.correctCount !== undefined && hw.incorrectCount !== undefined && hw.emptyCount !== undefined && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-card text-foreground border border-border shadow-sm">
                            {hw.correctCount}D / {hw.incorrectCount}Y / {hw.emptyCount}B
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
