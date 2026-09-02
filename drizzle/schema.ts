import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const machines = mysqlTable("pcm_machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  sector: varchar("sector", { length: 120 }).notNull(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  criticality: mysqlEnum("criticality", ["Baixa", "Média", "Alta", "Crítica"]).default("Média").notNull(),
  situation: mysqlEnum("situation", ["Operando", "Parada", "Em manutenção", "Desativada"]).default("Operando").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const preventives = mysqlTable("pcm_preventives", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  machineName: varchar("machineName", { length: 160 }).notNull(),
  sector: varchar("sector", { length: 120 }).notNull(),
  task: text("task").notNull(),
  scheduledDate: timestamp("scheduledDate").notNull(),
  frequency: varchar("frequency", { length: 80 }).notNull(),
  responsible: varchar("responsible", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["Programada", "Em execução", "Concluída", "Atrasada", "Aguardando peça"]).default("Programada").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const preventiveExecutions = mysqlTable("pcm_preventive_executions", {
  id: int("id").autoincrement().primaryKey(),
  preventiveId: int("preventiveId").notNull(),
  executedAt: timestamp("executedAt").notNull(),
  responsible: varchar("responsible", { length: 160 }).notNull(),
  observation: text("observation"),
  downtimeMinutes: int("downtimeMinutes").default(0).notNull(),
  pending: text("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
export type Preventive = typeof preventives.$inferSelect;
export type InsertPreventive = typeof preventives.$inferInsert;
export type PreventiveExecution = typeof preventiveExecutions.$inferSelect;
export type InsertPreventiveExecution = typeof preventiveExecutions.$inferInsert;
