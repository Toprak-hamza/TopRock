"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef } from "react";
import { getUsers, getHomeworks, getDetailedExams, getStudySessions, getGroups, getGroupMembers, Homework, ExamDetail, StudySession } from "@/lib/auth";
import { FileText, Loader2, Download, GraduationCap, Clock, Target, CalendarDays, CheckCircle, Search, ChevronDown, Check } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Weekly Metrics
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [exams, setExams] = useState<ExamDetail[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Combobox States
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Close combobox on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "coach") return;
      try {
        const [allUsers, allGroups, allMembers] = await Promise.all([
          getUsers(),
          getGroups(),
          getGroupMembers()
        ]);
        
        const myStudents = allUsers.filter(u => u.role === "student" && u.coachId === user.id);
        
        const studentsWithGroups = myStudents.map(student => {
          const studentGroupIds = allMembers
            .filter(m => m.studentId === student.id)
            .map(m => m.groupId);
          
          const studentGroupNames = allGroups
            .filter(g => studentGroupIds.includes(g.id))
            .map(g => g.name);
            
          return {
            ...student,
            groupNames: studentGroupNames,
            groupNameString: studentGroupNames.join(", ")
          };
        });

        setStudents(studentsWithGroups);
      } catch (e) {
        console.error(e);
      } finally {
        setIsDataLoading(false);
      }
    };
    if (!authLoading && user) fetchData();
  }, [user, authLoading]);

  // When selected student changes, fetch metrics
  useEffect(() => {
    const fetchStudentMetrics = async () => {
      if (!selectedStudentId) {
        setHomeworks([]);
        setExams([]);
        setStudySessions([]);
        return;
      }
      try {
        // Last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const allHws = await getHomeworks();
        const myHws = allHws.filter(h => 
          h.studentId === selectedStudentId && 
          new Date(h.createdAt) >= oneWeekAgo
        );

        const allExams = await getDetailedExams();
        const myExams = allExams.filter(e => 
          e.studentId === selectedStudentId && 
          new Date(e.date) >= oneWeekAgo
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const allSessions = await getStudySessions();
        const mySessions = allSessions.filter(s => 
          s.studentId === selectedStudentId && 
          new Date(s.createdAt) >= oneWeekAgo
        );

        setHomeworks(myHws);
        setExams(myExams);
        setStudySessions(mySessions);
      } catch (e: any) {
        console.error("fetchStudentMetrics error:", e);
        alert(`Veriler alınırken hata oluştu:\n\n${e.message || "Bilinmeyen hata"}\n\nLütfen konsolu kontrol edin.`);
      }
    };
    fetchStudentMetrics();
  }, [selectedStudentId]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !selectedStudentId) return;
    setIsGenerating(true);

    try {
      const student = students.find(s => s.id === selectedStudentId);
      
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RockSolid_Veli_Raporu_${student?.name || 'Ogrenci'}.pdf`);
      
    } catch (error) {
      console.error(error);
      alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || isDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate Metrics
  const totalHw = homeworks.length;
  const completedHw = homeworks.filter(h => h.completed).length;
  const hwRatio = totalHw > 0 ? Math.round((completedHw / totalHw) * 100) : 0;
  
  const totalFocusMinutes = studySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const focusHours = (totalFocusMinutes / 60).toFixed(1);

  const lastExam = exams.length > 0 ? exams[0] : null;
  const student = students.find(s => s.id === selectedStudentId);

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const nameMatch = s.name.toLowerCase().includes(query);
    const emailMatch = s.email ? s.email.toLowerCase().includes(query) : false;
    const groupMatch = s.groupNameString ? s.groupNameString.toLowerCase().includes(query) : false;
    return nameMatch || emailMatch || groupMatch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <FileText className="size-8 text-primary" /> Veli Raporlama Merkezi
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Öğrencinizin son 1 haftalık performans verilerini derleyerek profesyonel bir PDF çıktısı (Veli Gelişim Raporu) oluşturun.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex-1 w-full" ref={comboboxRef}>
          <label className="text-sm font-medium mb-1.5 block">Öğrenci Seçin</label>
          <div className="relative">
            <button
              onClick={() => setIsComboboxOpen(!isComboboxOpen)}
              className="w-full relative flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary hover:bg-muted/50 transition-colors"
            >
              <span className={cn("truncate", !selectedStudentId && "text-muted-foreground")}>
                {selectedStudentId 
                  ? students.find(s => s.id === selectedStudentId)?.name 
                  : "-- Öğrenci Ara ve Seç --"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
            </button>

            {isComboboxOpen && (
              <div className="absolute z-50 w-full mt-2 rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center border-b border-border px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    placeholder="İsim veya e-posta ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                  {filteredStudents.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Öğrenci bulunamadı.
                    </div>
                  ) : (
                    filteredStudents.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setIsComboboxOpen(false);
                          setSearchQuery("");
                        }}
                        className="relative flex w-full flex-col items-start rounded-md px-8 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Check 
                          className={cn(
                            "absolute left-2 top-2.5 h-4 w-4", 
                            selectedStudentId === s.id ? "opacity-100 text-primary" : "opacity-0"
                          )} 
                        />
                        <span className="font-medium">
                          {s.name}
                          {s.groupNameString && (
                            <span className="text-xs text-muted-foreground font-normal ml-1.5">
                              ({s.groupNameString})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.email}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={!selectedStudentId || isGenerating}
          className="w-full sm:w-auto mt-6 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          PDF Raporu İndir
        </button>
      </div>

      {!selectedStudentId ? (
        <div className="text-center p-12 bg-muted/20 border border-dashed border-border rounded-xl">
          <GraduationCap className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Raporu görüntülemek için listeden bir öğrenci seçin.</p>
        </div>
      ) : (
        <div className="relative overflow-hidden bg-white mt-8 rounded-xl border border-border shadow-md mx-auto max-w-3xl flex justify-center p-4">
          
          {/* THE PDF PANE TO BE RENDERED VIA HTML2CANVAS */}
          <div 
            ref={pdfRef} 
            className="w-full max-w-[700px] bg-white p-8 text-black"
            style={{ minHeight: "800px" }}
          >
            {/* Header / Letterhead */}
            <div className="border-b-4 border-emerald-600 pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-emerald-950 uppercase">ROCK<span className="text-emerald-600">SOLID</span> EDU</h1>
                <p className="text-emerald-800 font-semibold mt-1">HAFTALIK GELİŞİM RAPORU</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Tarih: {new Date().toLocaleDateString("tr-TR")}</p>
                <p className="font-medium text-gray-700 mt-1">Koç: {user?.name}</p>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="bg-gray-50 rounded-lg p-5 mb-8 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Öğrenci Bilgileri</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block mb-1">Ad Soyad</span><span className="font-semibold text-gray-900">{student?.name}</span></div>
                <div><span className="text-gray-500 block mb-1">E-Posta</span><span className="font-semibold text-gray-900">{student?.email}</span></div>
                <div><span className="text-gray-500 block mb-1">Sınıf / Grup</span><span className="font-semibold text-gray-900">{student?.groupNameString || "-"}</span></div>
                <div><span className="text-gray-500 block mb-1">Rapor Dönemi</span><span className="font-semibold text-gray-900">Son 7 Gün</span></div>
              </div>
            </div>

            {/* Metrics Board */}
            <h2 className="text-lg font-bold text-emerald-900 mb-4 border-b border-gray-200 pb-2">Haftalık Performans Özeti</h2>
            <div className="grid grid-cols-3 gap-4 mb-10">
              {/* Box 1 */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 text-center">
                <CheckCircle className="size-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-bold">Ödev Başarısı</p>
                <p className="text-3xl font-black text-gray-800">%{hwRatio}</p>
                <p className="text-xs text-gray-500 mt-1">{completedHw} / {totalHw} Tamamlandı</p>
              </div>
              
              {/* Box 2 */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 text-center">
                <Target className="size-6 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-bold">Son Sınav Neti</p>
                <p className="text-3xl font-black text-gray-800">{lastExam ? lastExam.overallNet : "-"}</p>
                <p className="text-xs text-gray-500 mt-1">{lastExam ? lastExam.examType : "Sınav Yok"}</p>
              </div>

              {/* Box 3 */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 text-center">
                <Clock className="size-6 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-bold">Odaklanma</p>
                <p className="text-3xl font-black text-gray-800">{focusHours} <span className="text-sm">Saat</span></p>
                <p className="text-xs text-gray-500 mt-1">Pomodoro Seansları</p>
              </div>
            </div>

            {/* Details Section */}
            <h2 className="text-lg font-bold text-emerald-900 mb-4 border-b border-gray-200 pb-2">Detaylı Değerlendirme</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><CalendarDays className="size-4" /> Son Deneme Sınavı Özeti</h3>
                {lastExam ? (
                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md border border-gray-100">
                    <p><strong className="text-gray-800">Sınav Adı:</strong> {lastExam.title}</p>
                    <p className="mt-1"><strong className="text-gray-800">Ders Dağılımı:</strong> {lastExam.subjectScores.map(ss => `${ss.subject} (${ss.net}n)`).join(", ")}</p>
                    {lastExam.coachNote && (
                      <p className="mt-3 pt-3 border-t border-gray-200 text-gray-800 italic">&quot; {lastExam.coachNote} &quot;</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Bu hafta içinde girilmiş bir deneme sınavı bulunmamaktadır.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><CheckCircle className="size-4" /> Ödev Durumu</h3>
                {homeworks.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {homeworks.slice(0, 5).map(hw => (
                      <li key={hw.id}>
                        {hw.subject} - {hw.description.substring(0, 40)}... 
                        <span className={hw.completed ? "text-emerald-600 font-medium ml-2" : "text-red-500 font-medium ml-2"}>
                          [{hw.completed ? "Tamamlandı" : "Eksik"}]
                        </span>
                      </li>
                    ))}
                    {homeworks.length > 5 && <li className="text-gray-400 italic">... ve {homeworks.length - 5} ödev daha.</li>}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Bu hafta öğrenciye atanmış ödev bulunmuyor.</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">Bu rapor RockSolid Edu Sistemi tarafından otomatik oluşturulmuştur.</p>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
