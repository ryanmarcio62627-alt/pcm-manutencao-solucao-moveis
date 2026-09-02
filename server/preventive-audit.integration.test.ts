import { describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb, updatePreventiveWithAudit, cancelPreventive } from "./db";
import { preventiveAuditLogs, preventives } from "../drizzle/schema";
import { appRouter } from "./routers";
import { createLocalToken } from "./localAuth";

describe("persistência da auditoria de preventivas", () => {
  it("mantém a preventiva e grava edição/cancelamento dentro da transação", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível para o teste integrado.");

    const [before] = await db.select().from(preventives).where(inArray(preventives.status, ["Programada", "Em execução", "Atrasada", "Aguardando peça"])).limit(1);
    if (!before) throw new Error("Nenhuma preventiva ativa disponível para o teste integrado.");
    const previousAudits = await db.select().from(preventiveAuditLogs).where(eq(preventiveAuditLogs.preventiveId, before.id));
    const previousAuditCount = previousAudits.filter((audit) => audit.preventiveId === before.id).length;
    const marker = `rollback-${Date.now()}`;
    const rollback = Symbol("rollback");
    let observed = false;

    try {
      await db.transaction(async (tx) => {
        const edited = await updatePreventiveWithAudit(before.id, { notes: marker }, { username: "ryan", role: "pcm" }, "Teste transacional de auditoria", tx);
        expect(edited).toMatchObject({ id: before.id, notes: marker });

        const cancelled = await cancelPreventive(before.id, "Teste transacional de cancelamento", { username: "ryan", role: "pcm" }, tx);
        expect(cancelled).toMatchObject({ id: before.id, status: "Cancelada" });

        const [stillThere] = await tx.select().from(preventives).where(eq(preventives.id, before.id));
        const auditRows = await tx.select().from(preventiveAuditLogs).where(eq(preventiveAuditLogs.preventiveId, before.id));
        const localAudits = auditRows.filter((audit) => audit.preventiveId === before.id);
        expect(stillThere?.id).toBe(before.id);
        expect(localAudits.length).toBeGreaterThanOrEqual(previousAuditCount + 2);
        expect(localAudits.some((audit) => audit.action === "Edição" && audit.reason === "Teste transacional de auditoria")).toBe(true);
        expect(localAudits.some((audit) => audit.action === "Cancelamento" && audit.reason === "Teste transacional de cancelamento")).toBe(true);
        observed = true;
        throw rollback;
      });
    } catch (error) {
      expect(error).toBe(rollback);
    }

    expect(observed).toBe(true);
    const [after] = await db.select().from(preventives).where(eq(preventives.id, before.id));
    const afterAudits = await db.select().from(preventiveAuditLogs).where(eq(preventiveAuditLogs.preventiveId, before.id));
    expect(after?.id).toBe(before.id);
    expect(after?.notes).toBe(before.notes);
    expect(after?.status).toBe(before.status);
    expect(afterAudits.filter((audit) => audit.preventiveId === before.id)).toHaveLength(previousAuditCount);
  });

  it("mantém auth.local.me autenticado depois de um cancelamento autenticado", async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível para o teste integrado.");
    const [before] = await db.select().from(preventives).where(inArray(preventives.status, ["Programada", "Em execução", "Atrasada", "Aguardando peça"])).limit(1);
    if (!before) throw new Error("Nenhuma preventiva ativa disponível para o teste integrado.");

    const token = await createLocalToken({ username: "ryan", role: "pcm" });
    const caller = appRouter.createCaller({ user: null, req: { headers: { cookie: `pcm_session=${token}` } } as any, res: {} as any });
    await expect(caller.auth.local.me()).resolves.toMatchObject({ username: "ryan", role: "pcm" });

    const rollback = Symbol("rollback-auth");
    try {
      await db.transaction(async (tx) => {
        await cancelPreventive(before.id, "Teste autenticado com rollback", { username: "ryan", role: "pcm" }, tx);
        await expect(caller.auth.local.me()).resolves.toMatchObject({ username: "ryan", role: "pcm" });
        throw rollback;
      });
    } catch (error) {
      expect(error).toBe(rollback);
    }

    const [after] = await db.select().from(preventives).where(eq(preventives.id, before.id));
    expect(after?.status).toBe(before.status);
    await expect(caller.auth.local.me()).resolves.toMatchObject({ username: "ryan", role: "pcm" });
  });
});
