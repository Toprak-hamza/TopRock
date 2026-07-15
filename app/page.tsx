"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role === "coach") {
        router.push("/coach/dashboard");
      } else if (user.role === "student") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 bg-background">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          BitigEdu Yükleniyor...
        </h1>
        <p className="text-muted-foreground text-sm">Giriş durumunuz kontrol ediliyor</p>
      </div>
    </div>
  );
}
