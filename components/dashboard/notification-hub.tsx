"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Notification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function NotificationHub() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.id);
      if (user.role === "coach") {
        // Coach sees student messages, task completions, and homework completions
        setNotifications(data.filter(n =>
          n.type === "student_message" ||
          n.type === "task_completed" ||
          n.type === "homework_completed"
        ));
      } else {
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Subscribe to realtime notification changes filtered by user_id
    const channel = supabase.channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Click outside listener to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Optimistic
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await markAllNotificationsAsRead(user.id);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
        await markNotificationAsRead(notification.id);
      } catch (err) {
        console.error(err);
      }
    }

    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 5);

  if (!user) return null;

  return (
    <div className="static md:relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors focus:outline-none"
        aria-label="Bildirimler"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center border-2 border-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-4 left-4 mt-2 md:right-0 md:left-auto md:w-80 md:mt-2 rounded-xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-md z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
            <span className="font-semibold text-sm">Bildirimler</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Hepsini Oku"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto py-1">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="size-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Henüz bildiriminiz bulunmuyor.</p>
              </div>
            ) : (
              recentNotifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg hover:bg-muted/50 transition-colors relative group cursor-pointer",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-foreground leading-tight">
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="text-muted-foreground hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Okundu olarak işaretle"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground opacity-60">
                    {new Date(notification.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })} - {new Date(notification.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                  {!notification.isRead && (
                    <span className="absolute top-3.5 right-3 size-1.5 bg-primary rounded-full group-hover:hidden" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="border-t border-border/50 px-3 py-1.5 text-center">
              <span className="text-[10px] text-muted-foreground">Son 5 bildirim gösterilmektedir</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
