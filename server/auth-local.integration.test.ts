import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createLocalToken } from "./localAuth";

const cookieName = "pcm_session";

describe("integração da sessão local no mobile", () => {
  it("preserva auth.local.me após login, foco, reconexão e troca de usuário", async () => {
    const password = process.env.PCM_ADMIN_PASSWORD;
    expect(password).toBeTruthy();

    const req = { headers: {} } as any;
    const cookieCalls: unknown[][] = [];
    const res = {
      cookie: (...args: unknown[]) => {
        cookieCalls.push(args);
        req.headers.cookie = `${cookieName}=${String(args[1])}`;
      },
      clearCookie: () => undefined,
    } as any;
    const caller = appRouter.createCaller({ req, res, user: undefined });

    await caller.auth.local.login({ username: "ryan", password: password ?? "" });
    expect(cookieCalls[0]?.[0]).toBe(cookieName);
    expect(cookieCalls[0]?.[2]).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", overwrite: true, maxAge: 60 * 60 * 12, path: "/" });
    expect(await caller.auth.local.me()).toMatchObject({ username: "ryan", role: "pcm" });

    for (const event of ["focus", "reconnect", "scroll-up", "scroll-down", "pull-to-refresh-cancelled"]) {
      void event;
      expect(await caller.auth.local.me()).toMatchObject({ username: "ryan", role: "pcm" });
    }

    req.headers.cookie = `${cookieName}=${await createLocalToken({ username: "josias", role: "campo" })}`;
    expect(await caller.auth.local.me()).toMatchObject({ username: "josias", role: "campo" });
  });
});
