import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      })
      .catch((err) => {
        setAuthError(err.message || String(err));
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // IMPORTANT: memoized on the actual identity fields, not on `session` as a
  // whole. Supabase silently refreshes the access token in the background
  // (periodically, and on tab focus) - that produces a brand-new `session`
  // object even though it's still the same logged-in user. Without this
  // memo, `user` would get a new object reference on every token refresh,
  // which cascaded into unwanted re-fetches and re-analysis throughout the
  // app (anything with `user` in its useEffect dependency array).
  const rawUser = session?.user;
  const user = useMemo(() => {
    if (!rawUser) return null;
    return {
      id: rawUser.id,
      email: rawUser.email,
      name: rawUser.user_metadata?.full_name || rawUser.email,
      avatarUrl: rawUser.user_metadata?.avatar_url || null
    };
  }, [
    rawUser?.id,
    rawUser?.email,
    rawUser?.user_metadata?.full_name,
    rawUser?.user_metadata?.avatar_url
  ]);

  return (
    <AuthContext.Provider value={{ session, user, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used within an <AuthProvider>");
  return ctx;
}
