import { describe, expect, it, vi } from "vitest";
import { PassThrough } from "node:stream";
import { machines, preventives, preventiveExecutions, backupRuns } from "../drizzle/schema";
import { createLocalToken } from "./localAuth";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  storagePut: vi.fn(),
  getPcmSummary: vi.fn(),
  listMachines: vi.fn(),
  listPreventives: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb, getPcmSummary: mocks.getPcmSummary, listMachines: mocks.listMachines, listPreventives: mocks.listPreventives }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { createPcmBackup, listPcmBackups } from "./backup";
import { handlePcmReport } from "./report";

describe("backup e relatório autorizados", () => {
  it("cria e lista um snapshot do PCM", async () => {
    const rows = {
      machines: [{ id: 1, name: "Prensa 01" }],
      preventives: [{ id: 2, task: "Inspecionar" }],
      executions: [{ id: 3, preventiveId: 2 }],
    };
    const select = vi.fn(() => ({ from: vi.fn((table: unknown) => table === machines ? Promise.resolve(rows.machines) : table === preventives ? Promise.resolve(rows.preventives) : Promise.resolve(rows.executions)) }));
    const insert = vi.fn(() => ({ values: vi.fn(() => ({ $returningId: async () => [{ id: 9 }] })) }));
    const db = { select, insert };
    mocks.getDb.mockResolvedValueOnce(db);
    mocks.storagePut.mockResolvedValueOnce({ key: "pcm-backups/test.json", url: "/manus-storage/pcm-backups/test.json" });
    const created = await createPcmBackup();
    expect(created).toMatchObject({ id: 9, itemCount: 3, key: "pcm-backups/test.json" });

    const historyDb = { select: vi.fn(() => ({ from: vi.fn((table: unknown) => table === backupRuns ? { orderBy: () => ({ limit: async () => [{ id: 9, status: "Concluído", itemCount: 3 }] }) } : Promise.resolve([])) })) };
    mocks.getDb.mockResolvedValueOnce(historyDb);
    await expect(listPcmBackups()).resolves.toEqual([{ id: 9, status: "Concluído", itemCount: 3 }]);
  });

  it("gera PDF para uma sessão PCM autorizada", async () => {
    const token = await createLocalToken({ username: "ryan", role: "pcm" });
    mocks.getPcmSummary.mockResolvedValueOnce({ downtimeMinutes: 0, byMachine: [], bySector: [] });
    mocks.listMachines.mockResolvedValueOnce([]);
    mocks.listPreventives.mockResolvedValueOnce([]);
    const response = new PassThrough() as PassThrough & { setHeader: (name: string, value: string) => void };
    const headers = new Map<string, string>();
    response.setHeader = (name, value) => headers.set(name, value);
    const chunks: Buffer[] = [];
    response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    const finished = new Promise<void>((resolve) => response.on("finish", () => resolve()));
    await handlePcmReport({ headers: { cookie: `pcm_session=${token}` } } as any, response as any);
    await finished;
    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
  });
});
