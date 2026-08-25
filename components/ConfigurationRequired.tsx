export const ConfigurationRequired = () => (
  <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center">
    <section className="max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-8">
      <h1 className="text-2xl font-bold">Falta configurar Supabase</h1>
      <p className="mt-3 text-slate-300">Crea el archivo <code>.env.local</code> a partir de <code>.env.example</code> y añade la URL y la clave pública del proyecto. Consulta el README para completar Supabase y Cloudflare R2.</p>
    </section>
  </main>
);
