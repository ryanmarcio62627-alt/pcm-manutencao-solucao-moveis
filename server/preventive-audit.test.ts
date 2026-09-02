import { describe, expect, it, vi } from "vitest";
import { createLocalToken } from "./localAuth";

const mocks = vi.hoisted(() => ({
  updatePreventiveWithAudit: vi.fn(async (id: number, data: Record<string, unknown>, actor: unknown, reason?: string) => ({ id, ...data, actor, reason })),
  cancelPreventive: vi.fn(async (id: number, reason: string, actor: unknown) => ({ id, status: "Cancelada", reason, actor })),
  listPreventiveAuditLogs: vi.fn(async () => [{ id: 1, preventiveId: 8, action: "Edição", actorUsername: "ryan", actorRole: "pcm", reason: "Ajuste de prazo", changes: "scheduledDate alterada", createdAt: new Date() }]),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

async function contextFor(username: string, role: "pcm" | "campo") {
  const token = await createLocalToken({ username, role });
  return { user: null, req: { protocol: "https", headers: { cookie: `pcm_session=${token}` } } as any, res: {} as any };
}

describe("auditoria de programações preventivas", () => {
  it("permite ao PCM editar e consultar o histórico", async () => {
    const caller = appRouter.createCaller(await contextFor("ryan", "pcm"));
    await expect(caller.preventives.update({ id: 8, data: { task: "Inspecionar guias" }, reason: "Ajuste de escopo" })).resolves.toMatchObject({ id: 8, task: "Inspecionar guias" });
    await expect(caller.preventives.auditHistory({ preventiveId: 8 })).resolves.toHaveLength(1);
    expect(mocks.updatePreventiveWithAudit).toHaveBeenCalledWith(8, { task: "Inspecionar guias" }, { username: "ryan", role: "pcm" }, "Ajuste de escopo");
  });

  it("exige motivo para cancelar e registra o ator do cancelamento", async () => {
    const caller = appRouter.createCaller(await contextFor("ryan", "pcm"));
    await expect(caller.preventives.cancel({ id: 8, reason: "Reprogramada por parada do equipamento" })).resolves.toMatchObject({ id: 8, status: "Cancelada" });
    expect(mocks.cancelPreventive).toHaveBeenCalledWith(8, "Reprogramada por parada do equipamento", { username: "ryan", role: "pcm" });
    await expect(caller.preventives.cancel({ id: 8, reason: "não" })).rejects.toThrow();
  });

  it("bloqueia edição, cancelamento e histórico para a equipe de campo", async () => {
    const caller = appRouter.createCaller(await contextFor("josias", "campo"));
    await expect(caller.preventives.update({ id: 8, data: { task: "Alteração indevida" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.preventives.cancel({ id: 8, reason: "Tentativa de cancelamento" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.preventives.auditHistory({ preventiveId: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
