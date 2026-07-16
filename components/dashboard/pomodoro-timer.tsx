"use client";

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Save, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { saveStudySession, getCurriculum } from '@/lib/auth';
import { cn } from '@/lib/utils';

const DEFAULT_SUBJECTS = [
  { id: 'sub_math', name: 'Matematik' },
  { id: 'sub_physics', name: 'Fizik' },
  { id: 'sub_chemistry', name: 'Kimya' },
  { id: 'sub_biology', name: 'Biyoloji' },
  { id: 'sub_turkish', name: 'Türkçe' },
  { id: 'sub_history', name: 'Tarih' },
  { id: 'sub_geography', name: 'Coğrafya' }
];

const FOCUS_TIPS = [
  "Telefonunu uçak moduna al ve odanın dışına bırak.",
  "İlk 5 dakika zor gelecek, sadece başla ve gerisini beyne bırak.",
  "Odaklanırken arkada sözsüz (Lo-Fi veya Klasik) müzikler tercih et.",
  "Gözlerini 20 saniyede bir uzağa odaklayarak dinlendir (20-20-20 kuralı).",
  "Çalışma alanındaki dikkat dağıtıcı tüm gereksiz kağıt ve eşyaları kaldır.",
  "Derin bir nefes al, 4 saniye tut ve 4 saniyede yavaşça ver (Kutu nefesi).",
  "Kendine küçük hedefler koy; örneğin 'bu seansta sadece 15 sayfa okuyacağım'.",
  "Bulunduğun odayı havalandır, temiz oksijen odaklanma süreni uzatır.",
  "Susuz kalma! Yanında her zaman bir bardak su bulundur ve yudumla.",
  "Zihninde başka düşünceler uçuşuyorsa, onları hızlıca bir kağıda yazıp masadan uzaklaştır."
];

export function PomodoroTimer() {
  const { user } = useAuth();
  const [seconds, setSeconds] = useState(1500);
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Dynamic Tip State
  const [tipIndex, setTipIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const rotateTip = () => {
    setFade(false);
    setTimeout(() => {
      setTipIndex((prev) => {
        let nextIndex = prev;
        while (nextIndex === prev) {
          nextIndex = Math.floor(Math.random() * FOCUS_TIPS.length);
        }
        return nextIndex;
      });
      setFade(true);
    }, 500);
  };

  // Rotate tip every 60s
  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * FOCUS_TIPS.length));

    const interval = setInterval(() => {
      rotateTip();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Rotate tip when timer starts
  useEffect(() => {
    if (isActive) {
      rotateTip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Dersleri Yükle
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getCurriculum();
        if (data && data.length > 0) {
          setSubjects(data);
          setSelectedSubjectId(data[0].id);
        } else {
          setSubjects(DEFAULT_SUBJECTS);
          setSelectedSubjectId(DEFAULT_SUBJECTS[0].id);
        }
      } catch (err) {
        console.error("Dersler yüklenirken hata oluştu:", err);
        setSubjects(DEFAULT_SUBJECTS);
        setSelectedSubjectId(DEFAULT_SUBJECTS[0].id);
      }
    };
    fetchSubjects();
  }, []);

  // Sayaç Mantığı
  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (isActive && seconds === 0) {
      // Bittiğinde otomatik kaydet
      setIsActive(false);
      handleSave();
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, seconds]);

  // Zaman Formatı (00:00)
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!user) return;
    const elapsedSeconds = 1500 - seconds;
    if (elapsedSeconds < 60) {
      // 1 dakikadan azsa kaydetmeye gerek yok veya sadece sıfırla
      setSeconds(1500);
      return;
    }
    
    setIsSaving(true);
    try {
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      await saveStudySession(user.id, elapsedMinutes, selectedSubjectId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
      setSeconds(1500);
    }
  };

  return (
    <div className="w-full max-w-[350px] sm:w-[400px] mx-auto overflow-hidden flex flex-col items-center justify-center space-y-4">
      {/* Akıllı Görev Seçici (Task Binder) */}
      <div className="w-full text-left">
        <label htmlFor="subject-select" className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          Çalışma Alanı / Ders Seçimi
        </label>
        <select
          id="subject-select"
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sayaç */}
      <p className="font-mono text-5xl sm:text-7xl font-semibold tabular-nums text-card-foreground">
        {formatTime(seconds)}
      </p>
      
      {/* Buton Düzeni (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2">
        <button
          type="button"
          onClick={() => {
            setIsActive(true);
          }}
          disabled={isActive}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-500 transition-colors disabled:opacity-40 w-full"
        >
          <Play className="size-4" /> Başlat
        </button>

        <button
          type="button"
          onClick={() => setIsActive(false)}
          disabled={!isActive}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-40 w-full text-muted-foreground"
        >
          <Pause className="size-4" /> Duraklat
        </button>

        <button
          type="button"
          onClick={() => {
            setIsActive(false);
            setSeconds(1500);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors w-full text-secondary-foreground"
        >
          <RotateCcw className="size-4" /> Sıfırla
        </button>

        <button
          type="button"
          onClick={() => {
            setIsActive(false);
            handleSave();
          }}
          disabled={seconds === 1500 || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 w-full"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Kaydet
        </button>
      </div>

      {/* İpucu Kutusu */}
      <div className="w-full mt-4 pt-4 border-t border-border/50 text-left">
        <div className="flex items-center gap-1.5 text-amber-500 mb-1">
          <Sparkles className="size-4 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Odaklanma İpucu</span>
        </div>
        <p className={cn(
          "text-xs text-muted-foreground leading-relaxed transition-opacity duration-500 min-h-[36px]",
          fade ? "opacity-100" : "opacity-0"
        )}>
          &quot;{FOCUS_TIPS[tipIndex]}&quot;
        </p>
      </div>
    </div>
  );
}
