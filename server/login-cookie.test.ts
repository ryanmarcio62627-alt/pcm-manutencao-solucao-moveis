import { describe, expect, it, vi } from "vitest";

const authenticateLocalLogin = vi.hoisted(() => vi.fn());
const createLocalToken = vi.hoisted(() => vi.fn());
const getLocalSession = vi.hoisted(() => vi.fn());
vi.mock("./localAuth", () => ({
  authenticateLocalLogin,
  createLocalToken,
  getLocalSession,
  createLocalAccount: vi.fn(),
  listLocalAccounts: vi.fn(),
  resetLocalAccountPassword: vi.fn(),
  setLocalAccountActive: vi.fn(),
  COOKIE_NAME: "pcm_session",
}));

import { appRouter } from "./routers";

describe("cookie de login local", () => {
  it("substitui o cookie anterior ao alternar entre Ryan e Josias nos dois sentidos", async () => {
    authenticateLocalLogin.mockResolvedValueOnce({ username: "ryan", role: "pcm" }).mockResolvedValueOnce({ username: "josias", role: "campo" }).mockResolvedValueOnce({ username: "ryan", role: "pcm" }).mockResolvedValueOnce({ username: "josias", role: "campo" });
    createLocalToken.mockResolvedValueOnce("token-ryan").mockResolvedValueOnce("token-josias").mockResolvedValueOnce("token-ryan-2").mockResolvedValueOnce("token-josias-2");
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };
    const caller = appRouter.createCaller({ req: { headers: {} } as any, res: res as any, user: undefined });

    await caller.auth.local.login({ username: "ryan", password: "senha" });
    await caller.auth.local.login({ username: "josias", password: "senha" });
    await caller.auth.local.login({ username: "ryan", password: "senha" });
    await caller.auth.local.login({ username: "josias", password: "senha" });

    expect(res.clearCookie).toHaveBeenCalledTimes(4);
    expect(res.cookie).toHaveBeenNthCalledWith(1, "pcm_session", "token-ryan", expect.objectContaining({ overwrite: true, maxAge: 60 * 60 * 12 }));
    expect(res.cookie).toHaveBeenNthCalledWith(2, "pcm_session", "token-josias", expect.objectContaining({ overwrite: true, maxAge: 60 * 60 * 12 }));
    expect(res.cookie).toHaveBeenNthCalledWith(3, "pcm_session", "token-ryan-2", expect.objectContaining({ overwrite: true, maxAge: 60 * 60 * 12 }));
    expect(res.cookie).toHaveBeenNthCalledWith(4, "pcm_session", "token-josias-2", expect.objectContaining({ overwrite: true, maxAge: 60 * 60 * 12 }));
  });
});
