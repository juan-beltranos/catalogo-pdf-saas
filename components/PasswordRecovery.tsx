import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export const PasswordRecovery = ({ onDone }: { onDone: () => void }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const { error: updateError } = await supabase!.auth.updateUser({ password });
    setLoading(false);
    if (updateError) setError(updateError.message); else onDone();
  };
  return <main className="min-h-screen bg-slate-950 px-4 flex items-center justify-center"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8"><h1 className="text-2xl font-bold">Crea una nueva contraseña</h1><p className="mt-2 text-sm text-slate-500">Debe tener al menos 8 caracteres.</p><div className="relative mt-6"><input type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-blue-500"/><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button></div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin"/>}Guardar contraseña</button></form></main>;
};
