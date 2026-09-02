import { describe, expect, it, vi } from "vitest";

const getDb = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getDb }));

import { authenticateLocalLogin, hashLocalPassword } from "./localAuth";

describe("contas individuais da equipe", () => {
  it("autentica um técnico usando senha armazenada como hash", async () => {
    const passwordHash = await hashLocalPassword("senha-segura-123");
    const account = { username: "joao.silva", role: "campo", active: true, passwordHash };
    getDb.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [account],
          }),
        }),
      }),
    });
    expect(passwordHash).not.toContain("senha-segura-123");
    await expect(authenticateLocalLogin("joao.silva", "senha-segura-123")).resolves.toEqual({ username: "joao.silva", role: "campo" });
    await expect(authenticateLocalLogin("joao.silva", "senha-errada")).resolves.toBeNull();
    account.active = false;
    await expect(authenticateLocalLogin("joao.silva", "senha-segura-123")).resolves.toBeNull();
  });
});

  it("cria uma conta técnica e bloqueia o login após desativação", async () => {
    let account: any;
    const db = {
      insert: () => ({ values: (values: any) => ({ $returningId: async () => { account = { id: 42, ...values }; return [{ id: 42 }]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ limit: async () => account ? [account] : [] }) }) }),
      update: () => ({ set: (patch: any) => ({ where: async () => { account = { ...account, ...patch }; } }) }),
    };
    getDb.mockResolvedValue(db);
    const created = await (await import("./localAuth")).createLocalAccount({ username: "ana.santos", displayName: "Ana Santos", password: "senha-ana-123", role: "campo" });
    expect(created).toMatchObject({ id: 42, username: "ana.santos", active: true });
    await expect(authenticateLocalLogin("ana.santos", "senha-ana-123")).resolves.toEqual({ username: "ana.santos", role: "campo" });
    const { setLocalAccountActive } = await import("./localAuth");
    await setLocalAccountActive(42, false);
    await expect(authenticateLocalLogin("ana.santos", "senha-ana-123")).resolves.toBeNull();
  });
