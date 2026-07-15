"use client";

import { useEffect, useState } from "react";
import { MessageSquare, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Feedback, getFeedbacks, sendCoachMessage } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function CoachMessageCard() {
  const { user, isLoading: authLoading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [coachName, setCoachName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Message to Coach Form State
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadData = async () => {
    if (!user || user.role !== "student") return;

    try {
      const studentFeedbacks = await getFeedbacks(user.id);
      setFeedbacks(studentFeedbacks);

      if (user.coachId) {
        const { data: coachData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.coachId)
          .single();
        if (coachData) setCoachName(coachData.name);
      }
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

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('feedback_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks', filter: `student_id=eq.${user.id}` }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAsRead = async (id: string) => {
    // Optimistic
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isRead: true } : f));
    await supabase.from('feedbacks').update({ is_read: true }).eq('id', id);
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.coachId || !note.trim() || sending) return;

    setSending(true);
    setSuccess(false);
    try {
      await sendCoachMessage(user.id, user.coachId, note);
      setNote("");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Yükleniyor...</span>
      </div>
    );
  }

  // If student doesn't have a coach, hide the component
  if (!user || !user.coachId) return null;

  const unreadCount = feedbacks.filter(f => !f.isRead).length;
  const latestFeedback = feedbacks.length > 0 ? feedbacks[0] : null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-md space-y-6">
      
      {/* 1. Coach Feedback Section (If exists) */}
      {latestFeedback && (
        <div className={`rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col sm:flex-row gap-4 sm:items-center ${!latestFeedback.isRead ? "border-primary/40 bg-primary/5" : "border-border/50 bg-background/30"}`}>
          {/* Icon Area */}
          <div className="flex-shrink-0 flex items-center justify-center relative">
            <div className={`p-2.5 rounded-full ${!latestFeedback.isRead ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              <MessageSquare className="size-5" />
            </div>
            {!latestFeedback.isRead && (
              <span className="absolute top-0 right-0 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
              </span>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">{coachName ? `${coachName} (Koç)` : "Koç Mesajı"}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {unreadCount} Yeni
                </span>
              )}
            </div>
            <p className={`text-sm leading-relaxed ${!latestFeedback.isRead ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              &quot;{latestFeedback.content}&quot;
            </p>
            <span className="text-[10px] text-muted-foreground opacity-60 block mt-1">
              {new Date(latestFeedback.createdAt).toLocaleString("tr-TR")}
            </span>
          </div>

          {/* Action Area */}
          {!latestFeedback.isRead && (
            <button
              onClick={() => markAsRead(latestFeedback.id)}
              className="flex-shrink-0 mt-2 sm:mt-0 px-3.5 py-1.5 bg-background border border-border/80 hover:bg-muted text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <CheckCircle2 className="size-3.5 text-green-500" /> Okundu İşaretle
            </button>
          )}
        </div>
      )}

      {/* Divider if feedback exists */}
      {latestFeedback && <div className="border-t border-border/50" />}

      {/* 2. Message to Coach Form */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" /> Koçunuza Not İletin
          </h4>
          <span className="text-xs text-muted-foreground">
            {coachName ? `${coachName} adlı koçunuza iletilecektir` : "Koçunuza doğrudan gider"}
          </span>
        </div>

        <form onSubmit={handleSendNote} className="space-y-3">
          <div className="relative">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bugün Matematik testinde zorlandım... / Haftalık hedeflerimi tamamladım koçum! 🚀"
              className="w-full rounded-xl border border-border/60 bg-background/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all"
              required
              disabled={sending}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            {success ? (
              <span className="text-xs text-green-500 font-semibold flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="size-4" /> Not başarıyla iletildi ve koçunuza bildirildi!
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={sending || !note.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>Notu Gönder <Send className="size-3.5" /></>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
