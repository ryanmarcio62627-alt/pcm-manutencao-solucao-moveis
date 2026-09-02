import { describe, expect, it, vi } from "vitest";

const getLocalSession = vi.hoisted(() => vi.fn());
vi.mock("./localAuth", async () => {
  const actual = await vi.importActual<typeof import("./localAuth")>("./localAuth");
  return { ...actual, getLocalSession };
});

import { appRouter } from "./routers";

const ctx = { req: { headers: {} } as any, res: { cookie: vi.fn(), clearCookie: vi.fn() } as any, user: undefined };

describe("permissões de gestão de contas", () => {
  it("bloqueia o perfil campo em todos os procedimentos administrativos", async () => {
    getLocalSession.mockResolvedValue({ username: "joao.silva", role: "campo" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.accounts.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.accounts.create({ username: "maria.souza", displayName: "Maria Souza", password: "senha-segura-123", role: "campo" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.accounts.setActive({ id: 1, active: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.accounts.resetPassword({ id: 1, password: "senha-segura-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
