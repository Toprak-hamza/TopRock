"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import { 
  getHomeworks, 
  getCurriculum, 
  saveStudySession, 
  getStudySessions, 
  Homework, 
  CurriculumSubject, 
  StudySession 
} from "@/lib/auth";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Loader2, 
  Volume2, 
  CloudRain, 
  Flame, 
  Music, 
  Trophy, 
  Calendar, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  Coffee, 
  Activity,
  Award,
  Waves,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const soundMap = {
  rain: CloudRain,
  fire: Flame,
  lofi: Music,
  binaural: Waves,
  library: BookOpen,
  cafe: Coffee,
};

const sounds = [
  { id: 'rain', label: 'Yağmur', icon: CloudRain, url: '/sounds/rain.ogg' },
  { id: 'fire', label: 'Şömine', icon: Flame, url: '/sounds/fire.ogg' },
  { id: 'lofi', label: 'Lofi Müzik', icon: Music, url: '/sounds/lofi.mp3' },
  { id: 'binaural', label: 'Binaural Frekans', icon: Waves, url: '' },
  { id: 'library', label: 'Kütüphane', icon: BookOpen, url: '/sounds/library.mp3' },
  { id: 'cafe', label: 'Kahve Uğultusu', icon: Coffee, url: '/sounds/cafe.mp3' },
];

const breakTips = [
  "Ayağa kalk ve kollarını yukarı doğru 15 saniye esnet.",
  "Gözlerini kapat ve 20 saniye boyunca uzağa bakarak göz kaslarını dinlendir (20-20-20 kuralı).",
  "Omuzlarını geriye doğru dairesel hareketlerle 10 kez döndür.",
  "Büyük bir bardak su içerek vüdumuzu hidre et.",
  "Derin bir nefes al, 4 saniye tut ve 4 saniyede yavaşça ver (Kutu nefesi).",
  "Boynunu yavaşça sağa ve sola eğerek boyun kaslarını rahatlat."
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

export default function PomodoroPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Data State
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Timer State
  const [seconds, setSeconds] = useState(1500); // 25 min default
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  
  // Ambient Sound State
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Binaural Beats Web Audio Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscLRef = useRef<OscillatorNode | null>(null);
  const oscRRef = useRef<OscillatorNode | null>(null);
  const gainLRef = useRef<GainNode | null>(null);
  const gainRRef = useRef<GainNode | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  
  // Break Tip State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Dynamic Study Tip State
  const [focusTipIndex, setFocusTipIndex] = useState(0);
  const [focusFade, setFocusFade] = useState(true);

  const rotateFocusTip = () => {
    setFocusFade(false);
    setTimeout(() => {
      setFocusTipIndex((prev) => {
        let nextIndex = prev;
        while (nextIndex === prev) {
          nextIndex = Math.floor(Math.random() * FOCUS_TIPS.length);
        }
        return nextIndex;
      });
      setFocusFade(true);
    }, 500);
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const hws = await getHomeworks();
      const activeHws = hws.filter(h => h.studentId === user.id && !h.completed);
      setHomeworks(activeHws);

      const cur = await getCurriculum();
      setSubjects(cur);

      const sessions = await getStudySessions();
      setStudySessions(sessions.filter(s => s.studentId === user.id));
    } catch (e) {
      console.error("Error loading pomodoro focus hub data:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (isActive && seconds === 0) {
      setIsActive(false);
      // Auto save on complete
      handleSave();
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, seconds]);

  // Rotates break tips during break mode
  useEffect(() => {
    let interval: any = null;
    if (isBreakMode) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % breakTips.length);
      }, 15000); // changes every 15 seconds
    }
    return () => clearInterval(interval);
  }, [isBreakMode]);

  // Rotates study tips every 60 seconds
  useEffect(() => {
    setFocusTipIndex(Math.floor(Math.random() * FOCUS_TIPS.length));
    const interval = setInterval(() => {
      rotateFocusTip();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Rotate study tip when timer starts
  useEffect(() => {
    if (isActive && !isBreakMode) {
      rotateFocusTip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isBreakMode]);

  const startBinauralBeats = () => {
    stopBinauralBeats();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const merger = ctx.createChannelMerger(2);

      // Left Channel: 150 Hz
      const oscL = ctx.createOscillator();
      const gainL = ctx.createGain();
      oscL.type = "sine";
      oscL.frequency.setValueAtTime(150, ctx.currentTime);
      oscL.connect(gainL);
      gainL.connect(merger, 0, 0);

      // Right Channel: 160 Hz (10 Hz diff for Alpha wave brainwave entrainment)
      const oscR = ctx.createOscillator();
      const gainR = ctx.createGain();
      oscR.type = "sine";
      oscR.frequency.setValueAtTime(160, ctx.currentTime);
      oscR.connect(gainR);
      gainR.connect(merger, 0, 1);

      // Main Gain Node
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume * 0.3, ctx.currentTime); // keep beats soft

      merger.connect(mainGain);
      mainGain.connect(ctx.destination);

      oscL.start(0);
      oscR.start(0);

      oscLRef.current = oscL;
      oscRRef.current = oscR;
      gainLRef.current = gainL;
      gainRRef.current = gainR;
      mainGainRef.current = mainGain;
    } catch (err) {
      console.error("Binaural Beats synthesis failed:", err);
    }
  };

  const stopBinauralBeats = () => {
    if (oscLRef.current) {
      try { oscLRef.current.stop(); } catch (e) {}
      oscLRef.current.disconnect();
      oscLRef.current = null;
    }
    if (oscRRef.current) {
      try { oscRRef.current.stop(); } catch (e) {}
      oscRRef.current.disconnect();
      oscRRef.current = null;
    }
    if (gainLRef.current) {
      gainLRef.current.disconnect();
      gainLRef.current = null;
    }
    if (gainRRef.current) {
      gainRRef.current.disconnect();
      gainRRef.current = null;
    }
    if (mainGainRef.current) {
      mainGainRef.current.disconnect();
      mainGainRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  };

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopBinauralBeats();
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handlePlaySound = (soundId: string) => {
    if (playingSound === soundId) {
      if (soundId === 'binaural') {
        stopBinauralBeats();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSound(null);
      return;
    }

    // Stop whatever was playing
    if (playingSound === 'binaural') {
      stopBinauralBeats();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;

    if (soundId === 'binaural') {
      startBinauralBeats();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(sound.url);
      } else {
        audioRef.current.src = sound.url;
      }
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => console.log("Audio play failed:", err));
    }
    setPlayingSound(soundId);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    if (audioRef.current) {
      audioRef.current.volume = newVal;
    }
    if (mainGainRef.current && audioContextRef.current) {
      mainGainRef.current.gain.setValueAtTime(newVal * 0.3, audioContextRef.current.currentTime);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const initialSeconds = isBreakMode ? 300 : 1500;
    const elapsedSeconds = initialSeconds - seconds;
    if (elapsedSeconds < 10) {
      // Don't save sessions shorter than 10 seconds
      setSeconds(initialSeconds);
      return;
    }

    setIsSaving(true);
    try {
      const elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));
      
      // Determine subject_id to write
      let subjectIdToSave: string | undefined = undefined;
      if (selectedSubjectId.startsWith('sub:')) {
        subjectIdToSave = selectedSubjectId.replace('sub:', '');
      } else if (selectedSubjectId.startsWith('hw:')) {
        const hwId = selectedSubjectId.replace('hw:', '');
        const hw = homeworks.find(h => h.id === hwId);
        if (hw) {
          const matched = subjects.find(s => 
            hw.subject.toLowerCase().includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(hw.subject.toLowerCase())
          );
          if (matched) {
            subjectIdToSave = matched.id;
          }
        }
      }

      await saveStudySession(user.id, elapsedMinutes, subjectIdToSave);
      await loadData();
    } catch (error) {
      console.error("Error saving focus session:", error);
    } finally {
      setIsSaving(false);
      setSeconds(initialSeconds);
    }
  };

  const handleModeSwitch = (breakMode: boolean) => {
    setIsActive(false);
    setIsBreakMode(breakMode);
    setSeconds(breakMode ? 300 : 1500);
  };

  // Today's Stats Calculation
  const today = new Date();
  const todaySessions = studySessions.filter(s => {
    const sDate = new Date(s.createdAt);
    return sDate.getDate() === today.getDate() &&
      sDate.getMonth() === today.getMonth() &&
      sDate.getFullYear() === today.getFullYear();
  });

  const todayMinutes = todaySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const todayXp = todaySessions.length * 20;

  if (authLoading || isLoadingData) {
    return (
      <DashboardShell activePath="/dashboard/pomodoro" title="Premium Odaklanma Merkezi">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      activePath="/dashboard/pomodoro"
      title="Premium Odaklanma Merkezi"
      subtitle="Odaklan, çalış, rozet kazan ve zihnini zinde tut."
    >
      <main className="px-8 py-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sol Kolon: Günlük İlerleme Kartı */}
          <section className="lg:col-span-1 rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Calendar className="size-5 text-violet-500" />
              <h2 className="text-sm font-bold text-foreground">Bugünkü İlerleme</h2>
            </div>
 
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 border border-border/50 p-3 rounded-lg text-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Seans</span>
                <span className="text-xl font-extrabold text-foreground">{todaySessions.length}</span>
              </div>
              <div className="bg-muted/30 border border-border/50 p-3 rounded-lg text-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Toplam</span>
                <span className="text-xl font-extrabold text-foreground">{todayMinutes} dk</span>
              </div>
            </div>
 
            <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-violet-500 animate-bounce" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Kazanılan XP</span>
                  <span className="text-[10px] text-muted-foreground">Bugünkü seanslardan</span>
                </div>
              </div>
              <span className="text-lg font-black text-violet-500">+{todayXp} XP</span>
            </div>
 
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Tamamlanan Seanslar</span>
              {todaySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Henüz seans tamamlanmadı.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {todaySessions.map((session, idx) => {
                    const matchedSub = subjects.find(s => s.id === session.subjectId);
                    return (
                      <div key={session.id} className="flex justify-between items-center p-2 rounded-md bg-muted/20 border border-border/50 text-xs">
                        <span className="font-semibold text-foreground">
                          {idx + 1}. Seans {matchedSub ? `(${matchedSub.name})` : "(Genel)"}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {new Date(session.createdAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
 
          {/* Orta Kolon: Pomodoro Sayacı & Task Binder */}
          <section className="lg:col-span-2 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 md:p-8 text-center shadow-md flex flex-col justify-between">
              
              {/* Task Binder */}
              <div className="space-y-1.5 text-left mb-6">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-wider block">Çalışma Konusu / Görevi Bağla</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                >
                  <option value="">Genel Çalışma (Ders Seçilmedi)</option>
                  {homeworks.length > 0 && (
                    <optgroup label="Aktif Ödevlerin">
                      {homeworks.map(hw => (
                        <option key={hw.id} value={`hw:${hw.id}`}>
                          {hw.subject}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {subjects.length > 0 && (
                    <optgroup label="Genel Ders Konuları">
                      {subjects.map(sub => (
                        <option key={sub.id} value={`sub:${sub.id}`}>
                          {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
 
              {/* Mode Triggers */}
              <div className="flex gap-2 p-1 bg-muted/60 border border-border rounded-lg mb-8 max-w-xs mx-auto">
                <button
                  onClick={() => handleModeSwitch(false)}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all",
                    !isBreakMode 
                      ? "bg-orange-600 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Çalışma Modu (25 dk)
                </button>
                <button
                  onClick={() => handleModeSwitch(true)}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all",
                    isBreakMode 
                      ? "bg-teal-600 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Mola Modu (5 dk)
                </button>
              </div>
 
              {/* Timer Circular/Display */}
              <div className="relative flex items-center justify-center my-4">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-6xl md:text-7xl font-black tabular-nums text-foreground tracking-tight">
                    {formatTime(seconds)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-widest">
                    {isBreakMode ? "Mola Zamanı" : "Odaklanma Süresi"}
                  </span>
                </div>
              </div>
 
              {/* Controls */}
              <div className="mt-8 grid grid-cols-2 gap-2.5 sm:flex sm:justify-center sm:gap-3 w-full max-w-sm sm:max-w-none mx-auto">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  disabled={isActive}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 sm:px-5 sm:py-2.5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40 w-full sm:w-auto",
                    isBreakMode ? "bg-teal-600 hover:bg-teal-500" : "bg-orange-600 hover:bg-orange-500"
                  )}
                >
                  <Play className="size-4" /> Başlat
                </button>
 
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  disabled={!isActive}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 sm:px-5 sm:py-2.5 text-sm font-bold hover:bg-muted transition-all active:scale-95 disabled:opacity-40 w-full sm:w-auto"
                >
                  <Pause className="size-4" /> Duraklat
                </button>
 
                <button
                  type="button"
                  onClick={() => {
                    setIsActive(false);
                    setSeconds(isBreakMode ? 300 : 1500);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 px-3.5 py-2.5 sm:px-5 sm:py-2.5 text-sm font-bold hover:bg-secondary/55 transition-all active:scale-95 w-full sm:w-auto"
                >
                  <RotateCcw className="size-4" /> Sıfırla
                </button>
 
                <button
                  type="button"
                  onClick={() => {
                    setIsActive(false);
                    handleSave();
                  }}
                  disabled={(seconds === (isBreakMode ? 300 : 1500)) || isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2.5 sm:px-5 sm:py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-40 w-full sm:w-auto"
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Kaydet
                </button>
              </div>
 
              {/* Ses Ambiyansı */}
              <div className="border-t border-border/50 mt-8 pt-6">
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-3">Zihin Dinlendirici Ambiyans</span>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {sounds.map(sound => {
                      const IconComponent = soundMap[sound.id as keyof typeof soundMap];
                      const isPlaying = playingSound === sound.id;
                      
                      return (
                        <button
                          key={sound.id}
                          onClick={() => handlePlaySound(sound.id)}
                          title={sound.label}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all active:scale-95 flex items-center justify-center",
                            isPlaying
                              ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                              : "border-border bg-muted/20 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <IconComponent className="size-5" />
                        </button>
                      );
                    })}
                  </div>
                  
                  {playingSound && (
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Volume2 className="size-4 text-muted-foreground" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>
                  )}
                </div>
              </div>
 
            </div>
          </section>
 
          {/* Sağ Kolon: Mola Modu Tavsiyeleri & Akıllı Bilgiler */}
          <section className="lg:col-span-1 space-y-6">
            
            {/* Break Mode Tips */}
            {isBreakMode ? (
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-teal-500/10 pb-3">
                  <Coffee className="size-5 text-teal-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-teal-800 dark:text-teal-400">Aktif Mola Rehberi</h2>
                </div>
                <p className="text-sm text-foreground leading-relaxed italic">
                  &quot;{breakTips[currentTipIndex]}&quot;
                </p>
                <div className="text-[10px] text-muted-foreground">
                  *Tavsiye her 15 saniyede bir güncellenir.
                </div>
                <div className="bg-teal-500/10 p-3 rounded-lg flex items-center gap-2">
                  <Activity className="size-4 text-teal-600 dark:text-teal-400 animate-spin" />
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">Nefes al ve gevşe.</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <Sparkles className="size-5 text-amber-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-foreground">Odaklanma İpucu</h2>
                </div>
                <p className={cn(
                  "text-xs text-muted-foreground leading-relaxed transition-opacity duration-500 italic min-h-[48px]",
                  focusFade ? "opacity-100" : "opacity-0"
                )}>
                  &quot;{FOCUS_TIPS[focusTipIndex]}&quot;
                </p>
                <div className="text-[10px] text-muted-foreground">
                  *İpucu her 60 saniyede bir veya sayaç her başladığında güncellenir.
                </div>
              </div>
            )}
 
            {/* XP and Badges info box */}
            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-violet-500" />
                <h3 className="text-sm font-bold text-foreground">Nasıl Puan Kazanılır?</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Her kaydettiğin ders çalışma seansı sana **+20 XP** kazandırır. Düzenli olarak seansları tamamlayarak seviyeni yükselt ve yeni rozetlerin kilidini aç!
              </p>
            </div>
 
          </section>
 
        </div>
      </main>
    </DashboardShell>
  );
}
