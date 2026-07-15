"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Book, getBooks, addBook, updateBookProgress, deleteBook } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Bookmark,
  ChevronRight
} from "lucide-react";

const SUBJECTS = [
  "Matematik",
  "Geometri",
  "Türkçe / Edebiyat",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Din Kültürü",
  "Genel Yetenek / Diğer"
];

export default function BookTrackerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [totalItems, setTotalItems] = useState<number>(300);
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");

  const loadBooks = async () => {
    if (!user) return;
    try {
      const data = await getBooks(user.id);
      setBooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "student") {
        router.push("/login");
        return;
      }
      loadBooks();

      // Realtime listener
      const channel = supabase.channel(`book_tracker_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'book_tracker', filter: `student_id=eq.${user.id}` },
          () => {
            loadBooks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !targetDate) return;
    if (totalItems <= 0) {
      setError("Toplam soru/sayfa sayısı 0'dan büyük olmalıdır.");
      return;
    }
    
    setSaving(true);
    setError("");
    try {
      await addBook({
        studentId: user.id,
        title,
        subject,
        totalItems,
        completedItems: 0,
        targetDate,
      });
      setTitle("");
      setTargetDate("");
      setTotalItems(300);
      await loadBooks();
    } catch (err: any) {
      console.error(err);
      setError("Kitap eklenirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgress = async (bookId: string, value: number) => {
    // Optimistic Update
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, completedItems: value } : b));
    try {
      await updateBookProgress(bookId, value);
    } catch (err) {
      console.error(err);
      loadBooks();
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Bu kitabı silmek istediğinize emin misiniz?")) return;
    // Optimistic Delete
    setBooks(prev => prev.filter(b => b.id !== bookId));
    try {
      await deleteBook(bookId);
    } catch (err) {
      console.error(err);
      loadBooks();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardShell activePath="/dashboard/books" title="Kitap Takip" subtitle="Soru bankalarınızı ve kitaplarınızı ekleyin, hedefinizi akıllı analizlerle takip edin.">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Form & Stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add Book Form */}
          <div className="lg:col-span-1 rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-md">
            <h2 className="flex items-center gap-2 font-semibold text-lg mb-4 text-foreground">
              <Bookmark className="size-5 text-primary animate-pulse" /> Yeni Kitap Ekle
            </h2>
            
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Kitap / Soru Bankası Adı</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="3D Paragraf Soru Bankası"
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Ders</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUBJECTS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Toplam Soru / Sayfa Sayısı</label>
                <input
                  type="number"
                  value={totalItems}
                  onChange={(e) => setTotalItems(parseInt(e.target.value) || 0)}
                  placeholder="300"
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Hedef Bitiş Tarihi</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 font-medium text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Ekle <Plus className="size-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Book List Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-lg text-foreground">
              <BookOpen className="size-5 text-primary" /> Kitap Listesi ve Akıllı Tahmin
            </h2>

            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center bg-card/10">
                <BookOpen className="size-12 text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold text-base mb-1">Kitap Takibi Boş</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Henüz takip ettiğiniz bir kitap bulunmuyor. Sol taraftaki formu doldurarak ilk kitabınızı ekleyin.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-1">
                {books.map((book) => {
                  // Math projection logic
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const target = new Date(book.targetDate);
                  target.setHours(0, 0, 0, 0);
                  const diffTime = target.getTime() - today.getTime();
                  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const remainingItems = book.totalItems - book.completedItems;
                  
                  const progressPct = Math.min(100, Math.max(0, Math.round((book.completedItems / book.totalItems) * 100)));

                  let projectionMessage = "";
                  let projectionIcon = <Sparkles className="size-4 text-violet-500" />;
                  let alertClass = "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20";

                  if (remainingItems <= 0) {
                    projectionMessage = "Tebrikler! Bu kitabı başarıyla tamamladınız! Harika bir çalışma. 🎉";
                    projectionIcon = <CheckCircle2 className="size-4 text-green-500" />;
                    alertClass = "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
                  } else if (remainingDays < 0) {
                    projectionMessage = `Hedef tarih ${Math.abs(remainingDays)} gün önce geçti. Kalan ${remainingItems} soru için yeni bir hedef belirleyin.`;
                    projectionIcon = <AlertCircle className="size-4 text-amber-500" />;
                    alertClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
                  } else if (remainingDays === 0) {
                    projectionMessage = `Bugün hedefin son günü! Kalan ${remainingItems} sorunun hepsini bugün bitirmelisin! 🎯`;
                    projectionIcon = <AlertCircle className="size-4 text-red-500" />;
                    alertClass = "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
                  } else {
                    const dailyRate = Math.ceil(remainingItems / remainingDays);
                    projectionMessage = `Hedefe ulaşmak için önündeki ${remainingDays} gün boyunca günde ortalama ${dailyRate} soru çözmelisin.`;
                    projectionIcon = <Sparkles className="size-4 text-violet-500 animate-pulse" />;
                    alertClass = "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20";
                  }

                  return (
                    <div 
                      key={book.id} 
                      className="rounded-2xl border border-border bg-card/40 p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all flex flex-col gap-4 relative group overflow-hidden"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                              {book.subject}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" /> Hedef: {new Date(book.targetDate).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-foreground mt-1 leading-snug">{book.title}</h3>
                        </div>

                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Kitabı sil"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {/* Interactive Progress Bar & Input */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                          <span>İlerleme: %{progressPct}</span>
                          <span>{book.completedItems} / {book.totalItems} Soru</span>
                        </div>

                        {/* Slider/Range Input */}
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max={book.totalItems}
                            value={book.completedItems}
                            onChange={(e) => handleUpdateProgress(book.id, parseInt(e.target.value) || 0)}
                            className="flex-1 h-2 rounded-lg bg-muted accent-primary cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max={book.totalItems}
                            value={book.completedItems}
                            onChange={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              if (val > book.totalItems) val = book.totalItems;
                              handleUpdateProgress(book.id, val);
                            }}
                            className="w-16 rounded-md border border-border bg-background/50 px-2 py-0.5 text-center text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Mathematical Analysis Projection */}
                      <div className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium ${alertClass}`}>
                        <div className="mt-0.5 flex-shrink-0">
                          {projectionIcon}
                        </div>
                        <p className="leading-relaxed">
                          {projectionMessage}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
