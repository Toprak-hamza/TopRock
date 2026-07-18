"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { User, Invitation, getUsers, getInvitations, createInvitation, generateReferralCode, deletePendingInvitation } from "@/lib/auth";
import { StudentCard } from "@/components/coach/student-card";
import { Plus, Users as UsersIcon, Search, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";


export default function CoachDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Deletion States
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<number>(0);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const loadData = async () => {
    if (!user) return;
    try {
      const authUsers = await getUsers();
      const coachStudents = authUsers.filter(u => u.role === "student" && u.coachId === user.id);
      setStudents(coachStudents);

      const allInvitations = await getInvitations();
      const coachInvitations = allInvitations.filter(i => i.coachId === user.id);
      setInvitations(coachInvitations);
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

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('coach_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `coach_id=eq.${user.id}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `coach_id=eq.${user.id}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics_progress' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStudentName.trim()) return;

    setIsSaving(true);
    try {
      await createInvitation({
        code: generateReferralCode(),
        coachId: user.id,
        studentName: newStudentName.trim()
      });

      setNewStudentName("");
      setIsAddModalOpen(false);
      await loadData();
    } catch (e) {
      console.error("Error creating invite", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    setIsDeleting(true);
    try {
      await deletePendingInvitation(invitationToDelete.code);
      setDeleteConfirmStep(0);
      setInvitationToDelete(null);
      await loadData();
    } catch (e) {
      console.error("Error deleting invitation:", e);
    } finally {
      setIsDeleting(false);
    }
  };


  const pendingInvitations = invitations.filter(i => i.status === "pending");
  
  let combinedList = [
    ...pendingInvitations.map(inv => ({ type: 'invitation' as const, data: inv })),
    ...students.map(std => ({ type: 'student' as const, data: std }))
  ];

  if (searchQuery) {
    combinedList = combinedList.filter(item => {
      const name = item.type === 'invitation' 
        ? item.data.studentName 
        : (item.data as User).name;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  if (authLoading || isDataLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Öğrencilerim</h1>
          <p className="text-muted-foreground text-sm mt-1">Sisteme kayıtlı ve davet bekleyen öğrencilerinizi yönetin.</p>
        </div>
        
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Öğrenci Ekle
        </button>
      </div>

      <div className="flex items-center gap-4 bg-background border border-border/50 rounded-lg p-2 max-w-md shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <input
          type="text"
          placeholder="Öğrenci ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      {combinedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Öğrenci Bulunamadı</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Henüz öğrenciniz bulunmuyor. Yeni bir öğrenci ekleyerek ona sisteme giriş referans kodu oluşturabilirsiniz.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" /> Yeni Öğrenci Ekle
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {combinedList.map((item) => (
            <StudentCard
              key={item.type === 'invitation' ? (item.data as Invitation).code : (item.data as User).id}
              student={item.type === 'student' ? (item.data as User) : undefined}
              invitation={item.type === 'invitation' ? (item.data as Invitation) : undefined}
              onDeleteInvitation={(inv) => {
                setInvitationToDelete(inv);
                setDeleteConfirmStep(1);
              }}
            />
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-border/50 p-6 flex justify-between items-center">
              <h2 className="text-lg font-bold">Yeni Öğrenci Davet Et</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors hover:bg-muted"
              >
                Kapat
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Öğrenci Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Örn: Ayşe Yılmaz"
                    disabled={isSaving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Eklendikten sonra öğrenciye iletebileceğiniz bir referans kodu oluşturulacaktır.
                </p>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Kod Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Aşama Onay Modalı */}
      {deleteConfirmStep === 1 && invitationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold text-foreground">Daveti İptal Et</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>{invitationToDelete.studentName}</strong> adına oluşturulan <strong>{invitationToDelete.code}</strong> referans kodlu daveti iptal etmek istediğinize emin misiniz?
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmStep(0);
                  setInvitationToDelete(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmStep(2)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors shadow-sm"
              >
                Evet, İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Aşama Onay Modalı */}
      {deleteConfirmStep === 2 && invitationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-card shadow-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce" />
              <h2 className="text-lg font-bold">DİKKAT: Son Kararınız Mı?</h2>
            </div>
            <p className="text-sm text-red-600/90 dark:text-red-400 leading-relaxed font-semibold">
              Bu işlem geri alınamaz! Öğrenci referans daveti veritabanından tamamen silinecektir. Silmek istediğinizden kesin olarak emin misiniz?
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmStep(0);
                  setInvitationToDelete(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                disabled={isDeleting}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteInvitation}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Evet, Daveti Kalıcı Olarak Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
