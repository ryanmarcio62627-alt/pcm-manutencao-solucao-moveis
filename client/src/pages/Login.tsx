import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.local.login.useMutation({
    onSuccess: () => { toast.success("Acesso liberado"); onLoggedIn(); },
    onError: (error) => toast.error(error.message),
  });

  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-4 text-slate-900">
    <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-10">
      <div className="mb-8 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f47b20] text-white shadow-lg shadow-orange-200"><Wrench className="h-6 w-6" /></div><div><p className="text-base font-bold">PCM Solução Móveis</p><p className="text-xs text-slate-500">Planejamento e Controle da Manutenção</p></div></div>
      <div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f47b20]">Acesso protegido</p><h1 className="text-3xl font-bold tracking-tight">Entrar no sistema</h1><p className="mt-2 text-sm leading-6 text-slate-500">Use seu acesso para consultar a rotina ou administrar o plano preventivo.</p></div>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); login.mutate({ username, password }); }}><div><label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="username">Usuário</label><Input id="username" autoComplete="username" placeholder="ryan ou campo" value={username} onChange={(event) => setUsername(event.target.value)} className="h-12 rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="password">Senha</label><Input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl" /></div><Button type="submit" disabled={login.isPending || !username || !password} className="h-12 w-full rounded-xl bg-slate-900 text-base font-bold text-[#f47b20] hover:bg-slate-700 disabled:bg-slate-100 disabled:text-[#f47b20] disabled:opacity-100">{login.isPending ? "Entrando..." : "Entrar"}</Button></form>
      <div className="mt-7 flex gap-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong className="text-slate-700">PCM:</strong> administra máquinas, preventivas, indicadores e backups. <strong className="text-slate-700">Campo:</strong> consulta atividades e registra execuções.</span></div>
    </section>
  </main>;
}
