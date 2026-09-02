import { describe, expect, it } from "vitest";
import { calculateMonthlyPreventiveSummary, getNextPreventiveDate } from "./db";

const preventive = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  machineId: 1,
  machineName: "Prensa 01",
  sector: "Produção",
  task: "Inspeção geral",
  scheduledDate: new Date("2026-09-05T12:00:00Z"),
  frequency: "Mensal",
  responsible: "Equipe A",
  status: "Programada",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("planejamento preventivo", () => {
  it("calcula a próxima data mensal sem ultrapassar o último dia do mês", () => {
    const next = getNextPreventiveDate(new Date(2026, 0, 31, 12), "Mensal");
    expect(next?.getFullYear()).toBe(2026);
    expect(next?.getMonth()).toBe(1);
    expect(next?.getDate()).toBe(28);
  });

  it("reconhece as periodicidades operacionais e ignora uma frequência desconhecida", () => {
    const base = new Date(2026, 8, 2, 12);
    expect(getNextPreventiveDate(base, "Diária")?.getDate()).toBe(3);
    expect(getNextPreventiveDate(base, "Semanal")?.getDate()).toBe(9);
    expect(getNextPreventiveDate(base, "Trimestral")?.getMonth()).toBe(11);
    expect(getNextPreventiveDate(base, "Personalizada")).toBeNull();
  });

  it("calcula cumprimento e backlog dos seis meses recentes", () => {
    const referenceDate = new Date("2026-09-15T12:00:00Z");
    const result = calculateMonthlyPreventiveSummary([
      preventive({ id: 1, scheduledDate: new Date("2026-08-10T12:00:00Z"), status: "Concluída" }),
      preventive({ id: 2, scheduledDate: new Date("2026-09-05T12:00:00Z"), status: "Atrasada" }),
      preventive({ id: 3, scheduledDate: new Date("2026-09-20T12:00:00Z"), status: "Programada" }),
    ] as any, referenceDate);
    const august = result.find((month) => month.key === "2026-08");
    const september = result.find((month) => month.key === "2026-09");
    expect(august).toMatchObject({ total: 1, done: 1, backlog: 0, compliance: 100 });
    expect(september).toMatchObject({ total: 2, done: 0, backlog: 1, compliance: 0 });
    expect(result).toHaveLength(6);
  });
});
