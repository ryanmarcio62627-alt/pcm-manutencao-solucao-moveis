import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { handlePcmReport } from "./report";
import type { TrpcContext } from "./_core/context";

describe("proteção de relatório e backups", () => {
  const unauthenticated = (): TrpcContext => ({
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  it("bloqueia criação e listagem de backups sem sessão PCM", async () => {
    const caller = appRouter.createCaller(unauthenticated());
    await expect(caller.backups.create()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.backups.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bloqueia o relatório PDF sem sessão local", async () => {
    const response = {
      status: (code: number) => ({ json: (body: unknown) => ({ code, body }) }),
    } as any;
    const result = await handlePcmReport({ headers: {} } as any, response);
    expect(result).toMatchObject({ code: 401, body: { error: "Faça login para gerar o relatório." } });
  });
});
