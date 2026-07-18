"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookOpen, User as UserIcon, Lock, Mail, Users, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Role, getInvitations, updateInvitationStatus } from "@/lib/auth";

type TabMode = "student" | "coach" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabMode>("student");

  useEffect(() => {
    if (!isLoading && user) {
      router.push(user.role === "coach" ? "/coach/dashboard" : "/dashboard");
    }
  }, [user, isLoading, router]);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [regCode, setRegCode] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent, role: Role) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    console.log(`[Login] Attempting sign-in for role: ${role}, email: ${cleanEmail}`);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        console.error("[Login] Supabase Auth Error:", signInError);
        setError("Hatalı e-posta veya şifre.");
        setLoading(false);
        return;
      }

      console.log("[Login] Supabase Authenticated successfully. User:", data.user?.id);

      // Verify profile availability under active RLS policy
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      // Fallback: If profile record is missing in DB, attempt to auto-create from auth metadata
      if (!profile || profileError) {
        console.warn("[Login] Profile missing or fetch error, auto-upserting profile...", profileError);
        const metaRole = data.user.user_metadata?.role || role;
        const metaName = data.user.user_metadata?.name || (role === "coach" ? "Koç Kullanıcı" : "Öğrenci Kullanıcı");

        const { data: newProfile, error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            name: metaName,
            role: metaRole,
            coach_id: data.user.user_metadata?.coachId || null
          })
          .select()
          .single();

        if (!upsertError && newProfile) {
          profile = newProfile;
          console.log("[Login] Profile successfully auto-created:", profile);
        }
      }

      if (!profile) {
        console.error("[Login] Profiles Table Query Error (Check RLS Policies):", profileError);
        setError("Profil verisi çekilemedi. Lütfen veritabanı RLS izinlerini kontrol edin.");
        setLoading(false);
        return;
      }

      console.log("[Login] Profile successfully fetched:", profile);

      if (profile.role !== role) {
        console.warn(`[Login] Role Mismatch. Expected: ${role}, Profile Role: ${profile.role}`);
        setError(`Seçilen rol (${role === "coach" ? "Koç" : "Öğrenci"}) bu hesapla uyuşmuyor.`);
        setLoading(false);
        return;
      }

      console.log("[Login] Session and Role verification passed. Proceeding with redirect.");
    } catch (err: any) {
      console.error("[Login] Unexpected error during authentication:", err);
      setError("Giriş esnasında beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Very basic validation - fetch invitations where code matches 
      // (in production we would use an edge function to do this securely)
      const { data: inviteList, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', regCode)
        .eq('status', 'pending');

      if (inviteError || !inviteList || inviteList.length === 0) {
        throw new Error("Geçersiz veya kullanılmış bir referans kodu girdiniz.");
      }

      const invite = inviteList[0];

      // Sign up User
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            name: regName || invite.student_name,
            role: 'student',
            coachId: invite.coach_id,
          }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const newUserId = authData.user?.id;
      if (newUserId) {
        await updateInvitationStatus(regCode, newUserId);
      }
      
      // Auto-log in is handled. Wait for redirect.
    } catch (err: any) {
      setError(err.message || "Kayıt işlemi başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = (role: Role) => (
    <form onSubmit={(e) => handleLogin(e, role)} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">E-posta Adresi</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={role === "coach" ? "coach@bitigedu.com" : "ogrenci@okul.com"}
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Şifre</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Giriş Yap <ArrowRight className="h-4 w-4" /></>}
      </button>
      
      {role === "student" && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">Bir koçtan davet kodu mu aldınız?</p>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className="text-primary hover:underline text-sm font-medium"
          >
            Referans Koduyla Kayıt Ol
          </button>
        </div>
      )}
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Referans Kodu</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={regCode}
            onChange={(e) => setRegCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            placeholder="Örn: BE-X7T9Q"
            required
            maxLength={9}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">İsim Soyisim</label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ad Soyad"
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">E-posta</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="ornek@ogrenci.com"
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Şifre Belirle</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input
            type="password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="En az 6 karakter"
            required
            minLength={6}
            disabled={loading}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2.5 font-medium text-white transition-all hover:bg-orange-700 focus:ring-4 focus:ring-orange-600/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kayıt Ol ve Katıl"}
      </button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setActiveTab("student")}
          className="text-muted-foreground hover:text-foreground text-sm"
          disabled={loading}
        >
          Giriş ekranına dön
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="fixed right-4 top-4 sm:right-6 sm:top-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-card/50 border border-border/50 rounded-2xl shadow-2xl backdrop-blur-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">BitigEdu</h1>
          <p className="text-sm text-muted-foreground mt-2">Sisteme giriş yapın veya kayıt olun</p>
        </div>

        {activeTab !== "register" && (
          <div className="flex bg-muted/50 p-1 rounded-lg mb-8">
            <button
              onClick={() => { setActiveTab("student"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "student" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserIcon className="w-4 h-4" /> Öğrenci
            </button>
            <button
              onClick={() => { setActiveTab("coach"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "coach" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" /> Koç
            </button>
          </div>
        )}

        {activeTab === "student" && renderLoginForm("student")}
        {activeTab === "coach" && renderLoginForm("coach")}
        {activeTab === "register" && renderRegisterForm()}
      </div>
    </div>
  );
}
