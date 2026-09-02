import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  machines: router({
    list: publicProcedure.query(() => listMachines()),
    create: publicProcedure.input(machineInput).mutation(({ input }) => createMachine(input)),
    update: publicProcedure.input(z.object({ id: z.number(), data: machineInput.partial() })).mutation(({ input }) => updateMachine(input.id, input.data)),
  }),
  preventives: router({
    list: publicProcedure.query(() => listPreventives()),
    summary: publicProcedure.query(() => getPcmSummary()),
    create: publicProcedure.input(preventiveInput).mutation(({ input }) => createPreventive(input)),
    update: publicProcedure.input(z.object({ id: z.number(), data: preventiveInput.partial() })).mutation(({ input }) => updatePreventive(input.id, input.data)),
    updateStatus: publicProcedure.input(z.object({ id: z.number(), status: preventiveInput.shape.status })).mutation(({ input }) => updatePreventive(input.id, { status: input.status })),
    execute: publicProcedure.input(z.object({
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
