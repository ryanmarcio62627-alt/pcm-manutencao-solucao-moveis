import { describe, expect, it, vi } from "vitest";
import { calculatePcmSummary } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createMachine: vi.fn(async (input: any) => ({ id: 1, ...input })),
  createPreventive: vi.fn(async (input: any) => ({ id: 1, ...input })),
  updatePreventive: vi.fn(async (id: number, data: any) => ({ id, ...data })),
  createExecution: vi.fn(async (input: any) => ({ id: 1, ...input })),
  listMachines: vi.fn(async () => []),
  listPreventives: vi.fn(async () => []),
  getPcmSummary: vi.fn(async () => ({ executions: [], downtimeMinutes: 0, byMachine: [], bySector: [] })),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...mocks };
});

function createContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const preventive = (overrides: any = {}) => ({ id: 1, machineId: 1, machineName: "Prensa 01", sector: "Produção", task: "Lubrificar guias", scheduledDate: new Date("2026-09-10T12:00:00Z"), frequency: "Mensal", responsible: "Equipe A", status: "Programada", ...overrides });

describe("PCM", () => {
  it("calcula horas paradas por máquina e setor", () => {
    const result = calculatePcmSummary(
      [preventive(), preventive({ id: 2, machineName: "Prensa 02", status: "Concluída" })] as any,
      [{ id: 1, preventiveId: 1, downtimeMinutes: 90 }, { id: 2, preventiveId: 2, downtimeMinutes: 30 }] as any,
    );
    expect(result.downtimeMinutes).toBe(120);
    expect(result.byMachine.find((item) => item.name === "Prensa 01")?.downtimeMinutes).toBe(90);
    expect(result.bySector.find((item) => item.name === "Produção")?.done).toBe(1);
  });

  it("valida entradas e executa as mutations principais", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.machines.create({ name: "Prensa 01", sector: "Produção", code: "PR-01", criticality: "Alta", situation: "Operando" })).resolves.toMatchObject({ name: "Prensa 01" });
    await expect(caller.preventives.create({ machineId: 1, machineName: "Prensa 01", sector: "Produção", task: "Inspecionar", scheduledDate: new Date(), frequency: "Mensal", responsible: "Equipe A", status: "Programada" })).resolves.toMatchObject({ task: "Inspecionar" });
    await expect(caller.preventives.updateStatus({ id: 1, status: "Em execução" })).resolves.toMatchObject({ status: "Em execução" });
    await expect(caller.preventives.execute({ preventiveId: 1, executedAt: new Date(), responsible: "Equipe A", downtimeMinutes: 20 })).resolves.toMatchObject({ preventiveId: 1, downtimeMinutes: 20 });
    await expect(caller.preventives.create({ machineId: 1, machineName: "", sector: "", task: "", scheduledDate: new Date(), frequency: "", responsible: "", status: "Programada" })).rejects.toThrow();
  });
});
