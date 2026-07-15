"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Group, Announcement, getGroups, getAnnouncements, createAnnouncement } from "@/lib/auth";
import { Loader2, Megaphone, Send, Calendar, Users, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CoachAnnouncementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const allGroups = await getGroups();
      setGroups(allGroups.filter(g => g.coachId === user.id));
      
      const allAnns = await getAnnouncements();
      setAnnouncements(allAnns.filter(a => a.coachId === user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim() || selectedGroupIds.length === 0) return;
    
    setIsSaving(true);
    try {
      await createAnnouncement({
        coachId: user.id,
        title: title.trim(),
        content: content.trim(),
        targetGroupIds: selectedGroupIds
      });
      setTitle("");
      setContent("");
      setSelectedGroupIds([]);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Megaphone className="size-8 text-rose-500" /> Duyuru Panosu
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Seçtiğiniz sınıflara topluca mesaj ve duyuru gönderin. Öğrenciler bu mesajları kendi panolarında anında görecekler.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Create Form */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Send className="size-5 text-primary" /> Yeni Duyuru Yayına Al
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Duyuru Başlığı</label>
              <input
                type="text"
                required
                disabled={isSaving}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Hafta Sonu Denemesi Hakkında"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">İçerik Detayları</label>
              <textarea
                required
                disabled={isSaving}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Öğrencilerinizin bilmesi gereken her şey..."
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                <span>Hedef Sınıflar <span className="text-red-500">*</span></span>
                <span className="text-xs text-primary font-bold">{selectedGroupIds.length} Seçili</span>
              </label>
              
              {groups.length === 0 ? (
                <div className="p-4 bg-muted/30 border border-border rounded-lg text-sm text-center text-muted-foreground">
                  Sisteme kayıtlı hiç sınıfınız yok. Önce &quot;Sınıflar&quot; menüsünden bir sınıf oluşturmalısınız.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {groups.map(group => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={(e) => toggleGroup(group.id, e)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all focus:outline-none text-left",
                          isSelected 
                            ? "border-primary bg-primary/5 text-primary font-medium" 
                            : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {isSelected ? <CheckSquare className="size-4 shrink-0" /> : <Square className="size-4 shrink-0 opacity-50" />}
                        <span className="truncate">{group.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving || selectedGroupIds.length === 0 || !title.trim() || !content.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 mt-4"
            >
              {isSaving ? <Loader2 className="size-5 animate-spin" /> : <Megaphone className="size-5" />}
              Duyuruyu Yayınla
            </button>
          </form>
        </section>

        {/* Right: History */}
        <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-5 border-b border-border/50 bg-muted/10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="size-5 text-accent" /> Yayındaki Duyurular
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {announcements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                <Megaphone className="size-12 mb-3" />
                <p className="text-sm">Henüz bir duyuru yayınlamadınız.</p>
              </div>
            ) : (
              <AnimatePresence>
                {announcements.map(ann => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    <h3 className="font-semibold text-lg text-foreground pr-8 leading-tight mb-1">{ann.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <Calendar className="size-3.5" /> 
                      {new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mb-4">
                      {ann.content}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1 flex items-center">
                        <Users className="size-3 mr-1 inline" /> Hedef:
                      </span>
                      {ann.targetGroupIds.map(gId => {
                        const targetG = groups.find(g => g.id === gId);
                        return (
                          <span key={gId} className="px-2 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-medium">
                            {targetG ? targetG.name : "Silinmiş Sınıf"}
                          </span>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
