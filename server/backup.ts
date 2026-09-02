import { backupRuns, machines, preventives, preventiveExecutions } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { desc } from "drizzle-orm";
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

export async function createPcmBackup() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const [machineRows, preventiveRows, executionRows] = await Promise.all([
    db.select().from(machines),
    db.select().from(preventives),
    db.select().from(preventiveExecutions),
  ]);
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    machines: machineRows,
    preventives: preventiveRows,
    executions: executionRows,
  };
  const content = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  const file = await storagePut(`pcm-backups/pcm-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, content, "application/json");
  const [created] = await db.insert(backupRuns).values({
    storageKey: file.key,
    storageUrl: file.url,
    itemCount: machineRows.length + preventiveRows.length + executionRows.length,
    status: "Concluído",
  }).$returningId();
  return { ...created, ...file, itemCount: payload.machines.length + payload.preventives.length + payload.executions.length };
}

export async function listPcmBackups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backupRuns).orderBy(desc(backupRuns.createdAt)).limit(20);
}

export async function handleScheduledPcmBackup(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });
    const result = await createPcmBackup();
    return res.json({ ok: true, backupId: result.id, itemCount: result.itemCount });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
  }
}
