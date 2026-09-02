import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMachine,
  InsertPreventive,
  InsertPreventiveExecution,
  Machine,
  Preventive,
  PreventiveExecution,
  machines,
  preventiveExecutions,
  preventives,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { users, InsertUser } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function listMachines(): Promise<Machine[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(machines).orderBy(machines.name);
}

export async function createMachine(input: InsertMachine): Promise<Machine> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(machines).values(input);
  const rows = await db.select().from(machines).where(eq(machines.id, result[0].insertId));
  return rows[0];
}

export async function updateMachine(id: number, input: Partial<InsertMachine>): Promise<Machine> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(machines).set(input).where(eq(machines.id, id));
  const rows = await db.select().from(machines).where(eq(machines.id, id));
  return rows[0];
}

export async function listPreventives(): Promise<Preventive[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(preventives).orderBy(desc(preventives.scheduledDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const row of rows) {
    const scheduledDay = new Date(row.scheduledDate);
    scheduledDay.setHours(0, 0, 0, 0);
    const shouldBeLate = row.status === "Programada" && scheduledDay.getTime() < today.getTime();
    const shouldReturnToProgrammed = row.status === "Atrasada" && scheduledDay.getTime() >= today.getTime();
    if (shouldBeLate || shouldReturnToProgrammed) {
      const nextStatus = shouldBeLate ? "Atrasada" : "Programada";
      row.status = nextStatus;
      await db.update(preventives).set({ status: nextStatus }).where(eq(preventives.id, row.id));
    }
  }
  return rows;
}

export async function createPreventive(input: InsertPreventive): Promise<Preventive> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(preventives).values(input);
  const rows = await db.select().from(preventives).where(eq(preventives.id, result[0].insertId));
  return rows[0];
}

export async function updatePreventive(id: number, input: Partial<InsertPreventive>): Promise<Preventive> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(preventives).set(input).where(eq(preventives.id, id));
  const rows = await db.select().from(preventives).where(eq(preventives.id, id));
  return rows[0];
}

function addMonthsKeepingDay(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

export function getNextPreventiveDate(date: Date | string | number, frequency: string): Date | null {
  const next = new Date(date);
  if (Number.isNaN(next.getTime())) return null;
  const normalized = frequency.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized === "diaria") next.setDate(next.getDate() + 1);
  else if (normalized === "semanal") next.setDate(next.getDate() + 7);
  else if (normalized === "quinzenal") next.setDate(next.getDate() + 14);
  else if (normalized === "mensal") return addMonthsKeepingDay(next, 1);
  else if (normalized === "trimestral") return addMonthsKeepingDay(next, 3);
  else if (normalized === "semestral") return addMonthsKeepingDay(next, 6);
  else if (normalized === "anual") return addMonthsKeepingDay(next, 12);
  else return null;
  return next;
}

export async function createExecution(input: InsertPreventiveExecution): Promise<PreventiveExecution> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const preventiveRows = await db.select().from(preventives).where(eq(preventives.id, input.preventiveId));
  const preventive = preventiveRows[0];
  const result = await db.insert(preventiveExecutions).values(input);
  await db.update(preventives).set({ status: "Concluída" }).where(eq(preventives.id, input.preventiveId));

  if (preventive) {
    const nextDate = getNextPreventiveDate(preventive.scheduledDate, preventive.frequency);
    if (nextDate && nextDate.getFullYear() <= 2037) {
      const siblings = await db.select().from(preventives).where(eq(preventives.machineId, preventive.machineId));
      const alreadyGenerated = siblings.some((item) => item.task === preventive.task && new Date(item.scheduledDate).getTime() === nextDate.getTime());
      if (!alreadyGenerated) {
        await db.insert(preventives).values({
          machineId: preventive.machineId,
          machineName: preventive.machineName,
          sector: preventive.sector,
          task: preventive.task,
          scheduledDate: nextDate,
          frequency: preventive.frequency,
          responsible: preventive.responsible,
          status: "Programada",
          notes: `Gerada automaticamente após a conclusão da preventiva #${preventive.id}.`,
        });
      }
    }
  }

  const rows = await db.select().from(preventiveExecutions).where(eq(preventiveExecutions.id, result[0].insertId));
  return rows[0];
}

export function calculatePcmSummary(allPreventives: Preventive[], rows: PreventiveExecution[]) {
  const machineMap = new Map<string, { name: string; total: number; done: number; downtimeMinutes: number }>();
  const sectorMap = new Map<string, { name: string; total: number; done: number; downtimeMinutes: number }>();
  for (const preventive of allPreventives) {
    const done = preventive.status === "Concluída" ? 1 : 0;
    const machine = machineMap.get(preventive.machineName) ?? { name: preventive.machineName, total: 0, done: 0, downtimeMinutes: 0 };
    machine.total += 1; machine.done += done; machineMap.set(preventive.machineName, machine);
    const sector = sectorMap.get(preventive.sector) ?? { name: preventive.sector, total: 0, done: 0, downtimeMinutes: 0 };
    sector.total += 1; sector.done += done; sectorMap.set(preventive.sector, sector);
  }
  const preventiveById = new Map(allPreventives.map((p) => [p.id, p]));
  for (const execution of rows) {
    const preventive = preventiveById.get(execution.preventiveId);
    if (!preventive) continue;
    const machine = machineMap.get(preventive.machineName); if (machine) machine.downtimeMinutes += execution.downtimeMinutes;
    const sector = sectorMap.get(preventive.sector); if (sector) sector.downtimeMinutes += execution.downtimeMinutes;
  }
  return { executions: rows, downtimeMinutes: rows.reduce((sum, row) => sum + row.downtimeMinutes, 0), byMachine: Array.from(machineMap.values()), bySector: Array.from(sectorMap.values()) };
}

export async function getPcmSummary() {
  const db = await getDb();
  if (!db) return calculatePcmSummary([], []);
  const rows = await db.select().from(preventiveExecutions).orderBy(desc(preventiveExecutions.executedAt));
  const allPreventives = await db.select().from(preventives);
  return calculatePcmSummary(allPreventives, rows);
}

export function calculateMonthlyPreventiveSummary(allPreventives: Preventive[], referenceDate = new Date()) {
  const current = new Date(referenceDate);
  current.setDate(1); current.setHours(0, 0, 0, 0);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(current);
    date.setMonth(current.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, total: 0, done: 0, backlog: 0, compliance: 0 };
  });
  const monthMap = new Map(months.map((month) => [month.key, month]));
  for (const preventive of allPreventives) {
    const scheduled = new Date(preventive.scheduledDate);
    const key = `${scheduled.getFullYear()}-${String(scheduled.getMonth() + 1).padStart(2, "0")}`;
    const month = monthMap.get(key);
    if (!month) continue;
    month.total += 1;
    if (preventive.status === "Concluída") month.done += 1;
    if (preventive.status !== "Concluída" && scheduled.getTime() <= referenceDate.getTime()) month.backlog += 1;
  }
  return months.map((month) => ({ ...month, compliance: month.total ? Math.round((month.done / month.total) * 100) : 0 }));
}

export async function getMonthlyPreventiveSummary() {
  const allPreventives = await listPreventives();
  return calculateMonthlyPreventiveSummary(allPreventives);
}

export async function getPreventiveMachineHistory(machineId: number) {
  const db = await getDb();
  if (!db) return { machineId, machineName: null, total: 0, done: 0, backlog: 0, preventives: [] };
  const allPreventives = await listPreventives();
  const machinePreventives = allPreventives.filter((preventive) => preventive.machineId === machineId);
  const executions = await db.select().from(preventiveExecutions).orderBy(desc(preventiveExecutions.executedAt));
  const preventiveIds = new Set(machinePreventives.map((preventive) => preventive.id));
  const machineExecutions = executions.filter((execution) => preventiveIds.has(execution.preventiveId));
  const executionsByPreventive = new Map<number, PreventiveExecution[]>();
  for (const execution of machineExecutions) {
    const list = executionsByPreventive.get(execution.preventiveId) ?? [];
    list.push(execution);
    executionsByPreventive.set(execution.preventiveId, list);
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    machineId,
    machineName: machinePreventives[0]?.machineName ?? null,
    total: machinePreventives.length,
    done: machinePreventives.filter((preventive) => preventive.status === "Concluída").length,
    backlog: machinePreventives.filter((preventive) => preventive.status !== "Concluída" && new Date(preventive.scheduledDate).getTime() <= today.getTime()).length,
    preventives: machinePreventives.map((preventive) => ({ ...preventive, executions: executionsByPreventive.get(preventive.id) ?? [] })),
  };
}
