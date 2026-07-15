"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { ExamDetail, ExamSubjectScore, getDetailedExams, saveExam } from "@/lib/auth";
import { Loader2, Calculator, Plus, TrendingUp, History, TestTube, Save } from "lucide-react";
import { ExamChart } from "@/components/dashboard/exam-chart";
import { ExamArchive } from "@/components/dashboard/exam-archive";

const EXAM_SUBJECTS: Record<string, string[]> = {
  TYT: ["Türkçe", "Matematik", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Fizik", "Kimya", "Biyoloji"],
  AYT: ["Matematik", "Fizik", "Kimya", "Biyoloji", "Türk Dili ve Edebiyatı", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Yabancı Dil"],
  LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "T.C. İnkılap Tarihi", "Yabancı Dil", "Din Kültürü"],
  YDT: ["Yabancı Dil"],
  DGS: ["Sayısal", "Sözel"],
  KPSS: ["Türkçe", "Matematik", "Tarih", "Coğrafya", "Vatandaşlık", "Güncel Bilgiler"],
  MSÜ: ["Türkçe", "Matematik", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Fizik", "Kimya", "Biyoloji"],
  İOKBS: ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler / Din Kültürü"],
  ALES: ["Sayısal", "Sözel"],
  YDS: ["Yabancı Dil"]
};

export default function ExamsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [exams, setExams] = useState<ExamDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examType, setExamType] = useState<string>("TYT");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Subject Input State => Key is subject name, value is { c: correct, i: incorrect, b: empty }
  const [scores, setScores] = useState<Record<string, { c: string, i: string, b: string }>>({});

  const loadData = async () => {
    if (!user) return;
    try {
      const allExams = await getDetailedExams(user.id);
      setExams(allExams);
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

  // When examType changes, prepopulate subjects
  useEffect(() => {
    const subjects = EXAM_SUBJECTS[examType] || [];
    const initialScores: Record<string, { c: string, i: string, b: string }> = {};
    subjects.forEach(sub => {
      initialScores[sub] = { c: "", i: "", b: "" };
    });
    setScores(initialScores);
  }, [examType]);

  const calculateNet = (correctStr: string, incorrectStr: string) => {
    const c = parseInt(correctStr) || 0;
    const i = parseInt(incorrectStr) || 0;
    const penalty = ["LGS", "İOKBS"].includes(examType) ? 3 : 4;
    return Number((c - (i / penalty)).toFixed(2));
  };

  const handleScoreChange = (subject: string, field: 'c' | 'i' | 'b', val: string) => {
    setScores(prev => ({
      ...prev,
      [subject]: { ...prev[subject], [field]: val }
    }));
  };

  const currentTotalNet = useMemo(() => {
    let sum = 0;
    Object.values(scores).forEach(val => {
      sum += calculateNet(val.c, val.i);
    });
    return Number(sum.toFixed(2));
  }, [scores, examType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !examTitle.trim() || !examDate) return;

    setIsSaving(true);
    try {
      const subjectScores: ExamSubjectScore[] = Object.entries(scores).map(([subject, val]) => {
        const c = parseInt(val.c) || 0;
        const i = parseInt(val.i) || 0;
        const b = parseInt(val.b) || 0;
        return {
          subject,
          correct: c,
          incorrect: i,
          empty: b,
          net: calculateNet(val.c, val.i)
        };
      });

      // Filter out empty rows (where c, i, and b are all 0/empty) to save DB space
      const filteredScores = subjectScores.filter(s => s.correct > 0 || s.incorrect > 0 || (s.empty !== undefined && s.empty > 0));

      await saveExam({
        studentId: user.id,
        examType,
        title: examTitle.trim(),
        date: examDate,
        overallNet: currentTotalNet,
        subjectScores: filteredScores
      });

      setExamTitle("");
      setIsAdding(false);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TestTube className="size-8 text-primary" /> Deneme Sınavı Takibi
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
            Sınav netlerinizi girin, sistem sizin için gelişim grafiğinizi oluştursun ve analizleri koçunuza iletsin.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="size-5" /> Yeni Sınav Ekle
          </button>
        )}
      </div>

      {isAdding && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calculator className="size-5 text-primary" /> Sonuç Girişi
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sınav Türü</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-border bg-muted/20">
                  {Object.keys(EXAM_SUBJECTS).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExamType(type)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${examType === type ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:bg-muted"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sınav Adı / Kurumu</label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Örn: 3D Yayınları Türkiye Geneli"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Sınav Tarihi</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[500px]">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-3">Ders</th>
                    <th className="px-4 py-3 text-center text-green-600">Doğru</th>
                    <th className="px-4 py-3 text-center text-red-500">Yanlış</th>
                    <th className="px-4 py-3 text-center text-orange-500">Boş</th>
                    <th className="px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {(EXAM_SUBJECTS[examType] || []).map((subject) => {
                    const cVal = scores[subject]?.c || "";
                    const iVal = scores[subject]?.i || "";
                    const bVal = scores[subject]?.b || "";
                    const netVal = calculateNet(cVal, iVal);
                    
                    return (
                      <tr key={subject} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-medium">{subject}</td>
                        <td className="px-3 md:px-4 py-2">
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={cVal}
                            onChange={(e) => handleScoreChange(subject, 'c', e.target.value)}
                            className="w-full min-w-[60px] md:min-w-[80px] min-h-[44px] mx-auto block rounded-lg border border-border bg-background px-2 text-center text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                          />
                        </td>
                        <td className="px-3 md:px-4 py-2">
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={iVal}
                            onChange={(e) => handleScoreChange(subject, 'i', e.target.value)}
                            className="w-full min-w-[60px] md:min-w-[80px] min-h-[44px] mx-auto block rounded-lg border border-border bg-background px-2 text-center text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                          />
                        </td>
                        <td className="px-3 md:px-4 py-2">
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={bVal}
                            onChange={(e) => handleScoreChange(subject, 'b', e.target.value)}
                            className="w-full min-w-[60px] md:min-w-[80px] min-h-[44px] mx-auto block rounded-lg border border-border bg-background px-2 text-center text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {netVal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-primary/5 border-t border-border">
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-right font-bold text-muted-foreground uppercase text-xs tracking-wider border-r border-border/50">
                      Toplam ({["LGS", "İOKBS"].includes(examType) ? "3Y 1D" : "4Y 1D"})
                    </td>
                    <td className="px-4 py-4 text-right font-black text-xl text-primary">
                      {currentTotalNet}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                İptal Et
              </button>
              <button
                type="submit"
                disabled={isSaving || !examTitle.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Kaydet
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Analytics & Archive Grid */}
      {!isAdding && (
         <div className="space-y-6">
           <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <TrendingUp className="size-5 text-primary" /> Net İvmesi
             </h2>
             <div className="w-full min-w-0 overflow-hidden">
               <ExamChart exams={exams} />
             </div>
           </section>

           <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <History className="size-5 text-accent" /> Sınav Arşivi
             </h2>
             <ExamArchive exams={exams} />
           </section>
         </div>
      )}
    </div>
  );
}
