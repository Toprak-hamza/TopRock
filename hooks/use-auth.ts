"use client";

import { useEffect, useState, useRef } from "react";
import { User, mapProfileToUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function updateAuthCookies(session: any, role: string | null) {
  if (typeof document === 'undefined') return;
  
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  if (session && role) {
    // Set cookie for token (expires in 7 days)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `sb-access-token=${session.access_token}; path=/; expires=${expires}; SameSite=Lax${secureFlag}`;
    document.cookie = `sb-user-role=${role}; path=/; expires=${expires}; SameSite=Lax${secureFlag}`;
  } else {
    // Clear cookies
    document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
    document.cookie = `sb-user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secureFlag}`;
  }
}

async function fetchOrCreateProfile(sessionUser: any) {
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionUser.id)
    .single();

  if (!profile) {
    const metaRole = sessionUser.user_metadata?.role || (sessionUser.email?.includes('coach') ? 'coach' : 'student');
    const metaName = sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Kullanıcı';

    const { data: newProfile } = await supabase
      .from('profiles')
      .upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        name: metaName,
        role: metaRole,
        coach_id: sessionUser.user_metadata?.coachId || null
      })
      .select()
      .single();

    profile = newProfile;
  }
  return profile;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  // Sync ref with state to prevent stale closures in event listeners
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Check active session
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          setUser(null);
          updateAuthCookies(null, null);
          return;
        }

        const profile = await fetchOrCreateProfile(session.user);

        if (profile) {
          const mapped = mapProfileToUser(profile);
          setUser(mapped);
          updateAuthCookies(session, mapped.role);
        } else {
          setUser(null);
          updateAuthCookies(null, null);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const currentUser = userRef.current;
        // If user profile is already loaded and token is just refreshed/checked, skip loading state and refetch
        if (currentUser && currentUser.id === session.user.id) {
          updateAuthCookies(session, currentUser.role);
          return;
        }

        setIsLoading(true);
        const profile = await fetchOrCreateProfile(session.user);
        if (profile) {
          const mapped = mapProfileToUser(profile);
          setUser(mapped);
          updateAuthCookies(session, mapped.role);
        } else {
          setUser(null);
          updateAuthCookies(null, null);
        }
      } else {
        setUser(null);
        updateAuthCookies(null, null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
