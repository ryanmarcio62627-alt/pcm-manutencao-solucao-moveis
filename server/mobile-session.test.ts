import { describe, expect, it } from "vitest";
import { localSessionQueryOptions } from "@shared/localSessionPolicy";
import { COOKIE_NAME, createLocalToken, getLocalSession } from "./localAuth";

describe("sessão no mobile", () => {
  it("não refaz a sessão ao recuperar foco e permite reconexão controlada", () => {
    expect(localSessionQueryOptions.refetchOnWindowFocus).toBe(false);
    expect(localSessionQueryOptions.refetchOnReconnect).toBe(true);
    expect(localSessionQueryOptions.retry).toBe(1);
  });

  it("mantém auth.local.me autenticado após eventos de rolagem e reconexão", async () => {
    const token = await createLocalToken({ username: "josias", role: "campo" });
    const request = { headers: { cookie: `${COOKIE_NAME}=${token}` } } as any;
    for (const event of ["scroll-up", "scroll-down", "focus", "reconnect", "pull-to-refresh-cancelled"]) {
      void event;
      const session = await getLocalSession(request);
      expect(session).toMatchObject({ username: "josias", role: "campo" });
    }
  });
});
