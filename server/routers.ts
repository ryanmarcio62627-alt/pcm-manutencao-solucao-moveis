import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { authenticateLocalLogin, createLocalAccount, createLocalToken, getLocalSession, listLocalAccounts, resetLocalAccountPassword, setLocalAccountActive, COOKIE_NAME as LOCAL_COOKIE } from "./localAuth";
import { createPcmBackup, listPcmBackups } from "./backup";
import {
  createExecution,
  createMachine,
  createPreventive,
  getPcmSummary,
  listMachines,
  listPreventives,
  updateMachine,
  updatePreventive,
} from "./db";

const machineInput = z.object({
  name: z.string().min(2),
  sector: z.string().min(2),
  code: z.string().min(1),
  criticality: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  situation: z.enum(["Operando", "Parada", "Em manutenção", "Desativada"]),
});

const preventiveInput = z.object({
  machineId: z.number(),
  machineName: z.string(),
  sector: z.string(),
  task: z.string().min(3),
  scheduledDate: z.coerce.date().refine((date) => date.getFullYear() >= 2020 && date.getFullYear() <= 2037, "Informe uma data válida entre 2020 e 2037"),
  frequency: z.string().min(2),
  responsible: z.string().min(2),
  status: z.enum(["Programada", "Em execução", "Concluída", "Atrasada", "Aguardando peça"]),
  notes: z.string().optional(),
});

const localProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const localUser = await getLocalSession(ctx.req);
  if (!localUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para acessar o sistema." });
  return next({ ctx: { ...ctx, localUser } });
});

const pcmProcedure = localProcedure.use(({ ctx, next }) => {
  if (ctx.localUser.role !== "pcm") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao PCM." });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    local: router({
      me: publicProcedure.query(({ ctx }) => getLocalSession(ctx.req)),
      login: publicProcedure.input(z.object({ username: z.string().min(1), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
        const session = await authenticateLocalLogin(input.username, input.password);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
        const token = await createLocalToken(session);
        ctx.res.cookie(LOCAL_COOKIE, token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 60 * 60 * 12 });
        return session;
      }),
      logout: publicProcedure.mutation(({ ctx }) => {
        ctx.res.clearCookie(LOCAL_COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: -1 });
        return { success: true } as const;
      }),
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  machines: router({
    list: localProcedure.query(() => listMachines()),
    create: pcmProcedure.input(machineInput).mutation(({ input }) => createMachine(input)),
    update: pcmProcedure.input(z.object({ id: z.number(), data: machineInput.partial() })).mutation(({ input }) => updateMachine(input.id, input.data)),
  }),
  accounts: router({
    list: pcmProcedure.query(() => listLocalAccounts()),
    create: pcmProcedure.input(z.object({ username: z.string().min(3), displayName: z.string().min(2), password: z.string().min(8), role: z.enum(["campo", "pcm"]).default("campo") })).mutation(({ input }) => createLocalAccount(input)),
    setActive: pcmProcedure.input(z.object({ id: z.number(), active: z.boolean() })).mutation(({ input }) => setLocalAccountActive(input.id, input.active)),
    resetPassword: pcmProcedure.input(z.object({ id: z.number(), password: z.string().min(8) })).mutation(({ input }) => resetLocalAccountPassword(input.id, input.password)),
  }),
  backups: router({
    list: pcmProcedure.query(() => listPcmBackups()),
    create: pcmProcedure.mutation(() => createPcmBackup()),
  }),
  preventives: router({
    list: localProcedure.query(() => listPreventives()),
    summary: localProcedure.query(() => getPcmSummary()),
    create: pcmProcedure.input(preventiveInput).mutation(({ input }) => createPreventive(input)),
    update: pcmProcedure.input(z.object({ id: z.number(), data: preventiveInput.partial() })).mutation(({ input }) => updatePreventive(input.id, input.data)),
    updateStatus: pcmProcedure.input(z.object({ id: z.number(), status: preventiveInput.shape.status })).mutation(({ input }) => updatePreventive(input.id, { status: input.status })),
    execute: localProcedure.input(z.object({
      preventiveId: z.number(),
      executedAt: z.coerce.date(),
      responsible: z.string().min(2),
      observation: z.string().optional(),
      downtimeMinutes: z.number().min(0),
      pending: z.string().optional(),
    })).mutation(({ input }) => createExecution(input)),
  }),
});

export type AppRouter = typeof appRouter;
