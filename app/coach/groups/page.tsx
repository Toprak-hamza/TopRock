"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { User, Group, GroupMember, getUsers, getGroups, getGroupMembers, createGroup, deleteGroup, updateGroupMembers } from "@/lib/auth";
import { Loader2, Layers, Plus, Trash2, Users as UsersIcon, Check, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CoachGroupsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // New Group State
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Active Group Edit State
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [stagedMemberIds, setStagedMemberIds] = useState<string[]>([]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const loadData = async () => {
    if (!user) return;
    try {
      const allUsers = await getUsers();
      setStudents(allUsers.filter(u => u.role === "student" && u.coachId === user.id));
      
      const allGroups = await getGroups();
      setGroups(allGroups.filter(g => g.coachId === user.id));
      
      const allMembers = await getGroupMembers();
      setMembers(allMembers);
    } catch (error) {
      console.error(error);
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    setIsCreating(true);
    try {
      await createGroup(newGroupName.trim(), user.id);
      setNewGroupName("");
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Sınıfı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteGroup(id);
      if (activeGroupId === id) setActiveGroupId(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const openGroupEditor = (groupId: string) => {
    setActiveGroupId(groupId);
    const existingMembers = members.filter(m => m.groupId === groupId).map(m => m.studentId);
    setStagedMemberIds(existingMembers);
    setStudentSearch("");
  };

  const toggleStudent = (studentId: string) => {
    setStagedMemberIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveMembers = async () => {
    if (!activeGroupId) return;
    setIsSavingMembers(true);
    try {
      await updateGroupMembers(activeGroupId, stagedMemberIds);
      await loadData();
      setActiveGroupId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingMembers(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeGroup = groups.find(g => g.id === activeGroupId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sınıflar & Gruplar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Toplu ödev atamaları için öğrencilerinizi sınıflara gruplayın.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Group List & Create */}
        <div className="md:col-span-1 space-y-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Yeni Sınıf Oluştur
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                required
                disabled={isCreating}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Sınıf Adı (Örn: 12-A)"
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                type="submit"
                disabled={isCreating || !newGroupName.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : "Oluştur"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-border/50 bg-muted/20">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="size-4 text-accent" /> Kayıtlı Sınıflar
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {groups.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Henüz bir sınıfınız yok.
                </div>
              ) : (
                groups.map(group => {
                  const studentCount = members.filter(m => m.groupId === group.id).length;
                  const isActive = activeGroupId === group.id;
                  return (
                    <div 
                      key={group.id}
                      onClick={() => openGroupEditor(group.id)}
                      className={cn(
                        "group relative p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                        isActive 
                          ? "border-primary bg-primary/5 shadow-[0_0_10px_rgba(var(--primary),0.1)]" 
                          : "border-transparent hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm text-foreground">{group.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{studentCount} Öğrenci</div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Group Editor */}
        <div className="md:col-span-2">
          {activeGroupId && activeGroup ? (
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-[650px] overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{activeGroup.name} Öğrencileri</h2>
                  <p className="text-sm text-muted-foreground mt-1">Sınıfa öğrenci ekleyin veya çıkartın.</p>
                </div>
                <div className="text-sm font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">
                  {stagedMemberIds.length} Seçili
                </div>
              </div>
              
              <div className="p-4 border-b border-border/50 bg-background">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Öğrenci ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted/30 pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students
                    .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map(student => {
                    const isSelected = stagedMemberIds.includes(student.id);
                    return (
                      <div 
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          isSelected 
                            ? "border-emerald-500/50 bg-emerald-500/5" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border",
                          isSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="size-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {students.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-10">
                    Sistemde hiç öğrenciniz bulunmuyor.
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3">
                <button
                  onClick={() => setActiveGroupId(null)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveMembers}
                  disabled={isSavingMembers}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSavingMembers ? <Loader2 className="size-4 animate-spin" /> : <UsersIcon className="size-4" />}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </motion.section>
          ) : (
            <div className="h-[650px] rounded-xl border border-dashed border-border/50 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <UsersIcon className="size-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Sınıf Seçilmedi</h3>
              <p className="text-sm mt-1 max-w-sm">
                Öğrencileri listelemek ve düzenlemek için sol taraftan bir sınıf seçin veya yeni bir tane oluşturun.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
