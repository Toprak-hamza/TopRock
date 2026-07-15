import { User, Invitation, getHomeworks } from "@/lib/auth";
import { TrendingUp, TrendingDown, Eye, Copy, CheckCircle2, Clock, ListChecks, Calendar, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StudentCardProps {
  student?: User;
  invitation?: Invitation;
  onDeleteInvitation?: (invitation: Invitation) => void;
}

export function StudentCard({ student, invitation, onDeleteInvitation }: StudentCardProps) {
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [netTrend, setNetTrend] = useState<{ value: number, isUp: boolean } | null>(null);
  const [hwStats, setHwStats] = useState({ total: 0, completed: 0 });

  const isPending = !!invitation && invitation.status === 'pending';
  const name = isPending ? invitation.studentName : student?.name || "Bilinmiyor";
  const code = isPending ? invitation.code : null;

  useEffect(() => {
    if (student) {
      if (typeof window !== "undefined") {
        const matrixDataStr = localStorage.getItem("bitigedu_matrix_progress");
        if (matrixDataStr) {
          const matrixData = JSON.parse(matrixDataStr);
          setProgress(matrixData[student.id] || 0);
        }

        const examsStr = localStorage.getItem("bitigedu_exams");
        if (examsStr) {
          const examsData = JSON.parse(examsStr);
          const studentExams = examsData[student.id];
          if (studentExams && studentExams.length >= 2) {
            const last = studentExams[studentExams.length - 1];
            const prev = studentExams[studentExams.length - 2];
            
            let sum = 0;
            let count = 0;
            // Get average of last 3 mapping from the end
            for (let i = Math.max(0, studentExams.length - 3); i < studentExams.length; i++) {
              sum += studentExams[i].net;
              count++;
            }
            
            const avg = count > 0 ? sum / count : 0;
            const isUp = last.net >= prev.net;
            setNetTrend({ value: Number(avg.toFixed(1)), isUp });
          } else if (studentExams && studentExams.length === 1) {
            setNetTrend({ value: studentExams[0].net, isUp: true });
          }
        }

        const fetchHwStats = async () => {
          try {
            const allHw = await getHomeworks() || [];
            const studentHw = allHw.filter(h => h.studentId === student.id);
            const completedHw = studentHw.filter(h => h.completed).length;
            setHwStats({ total: studentHw.length, completed: completedHw });
          } catch (e) {
            console.error("Error fetching HW for student card:", e);
            setHwStats({ total: 0, completed: 0 });
          }
        };
        
        fetchHwStats();
      }
    }
  }, [student]);

  const copyToClipboard = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 flex-shrink-0 flex items-center justify-center rounded-full ${isPending ? "bg-yellow-500" : "bg-green-500"}`}>
              {isPending && <Clock className="h-4 w-4 absolute opacity-0" />} 
            </div>
            <span className="text-sm font-medium text-muted-foreground">{isPending ? "Referans Bekleniyor" : "Aktif"}</span>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg line-clamp-1 mb-6 text-foreground">{name}</h3>

        {isPending ? (
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">Kayıt için kodu paylaşın:</p>
            <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
              <code className="flex-1 font-mono text-lg font-bold tracking-wider text-primary text-center">
                {code}
              </code>
              <button
                onClick={copyToClipboard}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                title="Kodu Kopyala"
              >
                {copied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 mb-6">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Müfredat İlerlemesi</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-sm text-muted-foreground">Net Trendi (Ort)</span>
              {netTrend ? (
                <div className="flex items-center gap-1.5 font-medium">
                  {netTrend.value}
                  {netTrend.isUp ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Veri Yok</span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-orange-500/5 border border-orange-500/10 p-3">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5"><ListChecks className="size-4 text-orange-500" /> Atanan Ödevler</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-foreground">{hwStats.completed}</span>
                <span className="text-muted-foreground text-xs">/ {hwStats.total}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isPending && student && (
        <div className="mt-4 border-t border-border/50 pt-4 flex gap-2">
          <Link
            href={`/coach/student/${student.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Eye className="size-4" /> Profili İncele
          </Link>
          <Link
            href={`/coach/schedule/${student.id}`}
            className="flex items-center justify-center rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-500 transition-colors hover:bg-emerald-500/20"
            title="Program Ata"
          >
            <Calendar className="size-4" /> Program
          </Link>
        </div>
      )}
      {isPending && invitation && (
        <div className="mt-4 border-t border-border/50 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onDeleteInvitation?.(invitation)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20 active:scale-95"
          >
            <Trash2 className="size-4" /> Daveti İptal Et
          </button>
        </div>
      )}
    </div>
  );
}

