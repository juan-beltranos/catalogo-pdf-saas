import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadingTimeout = window.setTimeout(() => {
      if (active) {
        console.warn("Supabase tardó demasiado en recuperar la sesión.");
        setLoading(false);
      }
    }, 6000);

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setSession(data.session);
      })
      .catch((error) => {
        console.error("No fue posible recuperar la sesión de Supabase:", error);
      })
      .finally(() => {
        if (active) {
          window.clearTimeout(loadingTimeout);
          setLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      window.clearTimeout(loadingTimeout);
      setSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
    });
    return () => {
      active = false;
      window.clearTimeout(loadingTimeout);
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading, passwordRecovery, finishPasswordRecovery: () => setPasswordRecovery(false) };
}
