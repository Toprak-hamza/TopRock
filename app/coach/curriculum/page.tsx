"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { CurriculumSubject, getCurriculum, saveCurriculum } from "@/lib/auth";
import { BookOpen, Plus, Trash2, Library, ChevronRight, X, Loader2 } from "lucide-react";

export default function CurriculumEditorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Topic input states mapped by Subject ID: { 'sub_math': 'Logaritma' }
  const [newTopicNames, setNewTopicNames] = useState<Record<string, string>>({});

  const loadData = async () => {
    setIsDataLoading(true);
    try {
      const arr = await getCurriculum() || [];
      setSubjects(arr);
    } catch (e) {
      console.error(e);
      setSubjects([]);
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

  // If you also added Realtime for curriculum, you can put the hook here.

  if (authLoading || isDataLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "coach") return null;

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const newSub: CurriculumSubject = {
      id: `sub_${Date.now()}`,
      name: newSubjectName.trim(),
      topics: []
    };
    const updated = [...subjects, newSub];
    
    // Optimistic UI
    setSubjects(updated);
    setNewSubjectName("");

    try {
      await saveCurriculum(updated);
    } catch (e) {
      console.error(e);
      await loadData(); // rollback on failure
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm("Bu dersi ve içindeki TÜM konuları silmek istediğinize emin misiniz? Öğrencilerin bu dersteki analiz puanları sıfırlanacaktır.")) {
      const updated = subjects.filter(s => s.id !== id);
      
      setSubjects(updated);
      try {
        await saveCurriculum(updated);
      } catch (e) {
        console.error(e);
        await loadData();
      }
    }
  };

  const handleTopicNameChange = (subjectId: string, val: string) => {
    setNewTopicNames(prev => ({ ...prev, [subjectId]: val }));
  };

  const handleAddTopic = async (subjectId: string) => {
    const topicName = newTopicNames[subjectId]?.trim();
    if (!topicName) return;

    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, topics: [...s.topics, topicName] };
      }
      return s;
    });

    setSubjects(updated);
    setNewTopicNames(prev => ({ ...prev, [subjectId]: "" }));

    try {
      await saveCurriculum(updated);
    } catch(e) {
      console.error(e);
      await loadData();
    }
  };

  const handleDeleteTopic = async (subjectId: string, topicIndex: number) => {
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        const newTopics = [...s.topics];
        newTopics.splice(topicIndex, 1);
        return { ...s, topics: newTopics };
      }
      return s;
    });
    
    setSubjects(updated);
    try {
      await saveCurriculum(updated);
    } catch(e) {
      console.error(e);
      await loadData();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Library className="size-8 text-primary" />
          Müfredat Yönetimi
        </h1>
        <p className="mt-2 text-muted-foreground">
          Buradan eklediğiniz/sildiğiniz tüm ders ve konu başlıkları anında tüm öğrencilerin Konu Matrisine uygulanacaktır.
        </p>
      </div>

      {/* Add New Subject */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4 max-w-2xl">
        <div className="flex-1 w-full">
          <label className="text-sm font-medium mb-1.5 block">Yeni Ders Ekle</label>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
            placeholder="Örn: Geometri, Kimya, Tarih..."
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>
        <button
          onClick={handleAddSubject}
          disabled={!newSubjectName.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="size-4" /> Ekle
        </button>
      </div>

      <div className="grid gap-6">
        {subjects.map(subject => (
          <div key={subject.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row">
            {/* Left Side: Subject Header */}
            <div className="bg-muted/10 p-6 md:w-1/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
              <div>
                <div className="flex items-center gap-2 text-primary mb-3">
                  <BookOpen className="size-5" />
                  <h2 className="text-xl font-bold text-foreground">{subject.name}</h2>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ChevronRight className="size-4" /> {subject.topics.length} Konu Bulunuyor
                </div>
              </div>
              <button 
                onClick={() => handleDeleteSubject(subject.id)}
                className="mt-6 flex items-center justify-center gap-2 w-full py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="size-4" /> Dersi Tamamen Sil
              </button>
            </div>

            {/* Right Side: Topics Editor */}
            <div className="p-6 md:w-2/3 flex flex-col">
              {/* Add Topic Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
                <input
                  type="text"
                  value={newTopicNames[subject.id] || ""}
                  onChange={(e) => handleTopicNameChange(subject.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTopic(subject.id)}
                  placeholder={`${subject.name} dersine yeni bir konu ekle...`}
                  className="flex-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => handleAddTopic(subject.id)}
                  disabled={!newTopicNames[subject.id]?.trim()}
                  className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 w-full sm:w-auto px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ekle
                </button>
              </div>

              {/* Topics Flow */}
              <div className="flex flex-wrap gap-2">
                {subject.topics.length === 0 && (
                  <span className="text-sm text-muted-foreground italic py-2">Henüz konu eklenmemiş.</span>
                )}
                {subject.topics.map((topic, idx) => (
                  <div key={`${topic}-${idx}`} className="flex items-center bg-primary/5 border border-primary/20 rounded-full pl-3 pr-1 py-1 group transition-colors hover:border-primary/40">
                    <span className="text-sm font-medium text-foreground mr-2">{topic}</span>
                    <button
                      onClick={() => handleDeleteTopic(subject.id, idx)}
                      className="p-1 rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title="Sil"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
