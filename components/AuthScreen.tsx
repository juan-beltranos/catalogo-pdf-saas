import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getPlan, PlanId } from "../lib/plans";

type Mode = "login" | "register" | "forgot";

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [purchasedPlan, setPurchasedPlan] = useState<PlanId | null>(null);

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
    if (!token) return;
    setRegistrationToken(token);
    void fetch(`/api/auth/register?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "El enlace de compra no es válido.");
        setPurchasedPlan(result.plan);
        setMode("register");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "El enlace de compra no es válido."));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });
        if (authError) throw authError;
        setMessage("Te enviamos un enlace para recuperar tu contraseña.");
      } else if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, token: registrationToken }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "No fue posible crear la cuenta.");

        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (loginError) throw new Error("La cuenta fue creada, pero no se pudo iniciar sesión automáticamente. Intenta ingresar.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible completar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-900 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white"><Sparkles /></div>
          <div><h1 className="text-xl font-bold">Catálogo Instantáneo</h1><p className="text-sm text-slate-500">Tus catálogos, disponibles en cualquier dispositivo.</p></div>
        </div>
        <h2 className="text-2xl font-bold">
          {mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña"}
        </h2>
        {mode === "register" && purchasedPlan && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Versión comprada</p>
            <p className="text-lg font-extrabold text-emerald-900">Plan {getPlan(purchasedPlan).name}</p>
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-medium">Correo electrónico</span><div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400"/><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 outline-none focus:ring-2 focus:ring-blue-500" /></div></label>
          {mode !== "forgot" && <label className="block"><span className="mb-1 block text-sm font-medium">Contraseña</span><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400"/><input type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-12 outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button></div></label>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button disabled={loading || (mode === "register" && !purchasedPlan)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin"/>}{mode === "login" ? "Entrar" : mode === "register" ? "Registrarme" : "Enviar enlace"}</button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <button onClick={() => setMode(mode === "register" ? "login" : "register")} className="font-medium text-blue-600">{mode === "register" ? "Ya tengo cuenta" : "Registrar compra"}</button>
          <button onClick={() => setMode(mode === "forgot" ? "login" : "forgot")} className="text-slate-500">{mode === "forgot" ? "Volver" : "Olvidé mi contraseña"}</button>
        </div>
      </section>
    </main>
  );
};
