import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const getDb = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getDb }));

import { LocalGreeting } from "../client/src/components/LocalGreeting";
import { authenticateLocalLogin, createLocalAccount, validateLocalLogin } from "./localAuth";

describe("fluxo integrado de login e saudação", () => {
  it("renderiza o nome do PCM e do técnico conforme a sessão autenticada", async () => {
    const pcm = validateLocalLogin("ryan", process.env.PCM_ADMIN_PASSWORD ?? "");
    expect(pcm).toEqual({ username: "ryan", role: "pcm" });
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: pcm?.username }))).toContain("Bom trabalho, Ryan.");

    let account: any;
    getDb.mockResolvedValue({
      insert: () => ({ values: (values: any) => ({ $returningId: async () => { account = { id: 77, ...values }; return [{ id: 77 }]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ limit: async () => account ? [account] : [] }) }) }),
    });
    await createLocalAccount({ username: "josias", displayName: "Josias", password: "senha-josias-123", role: "campo" });
    const technician = await authenticateLocalLogin("josias", "senha-josias-123");
    expect(technician).toEqual({ username: "josias", role: "campo" });
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: technician?.username }))).toContain("Bom trabalho, Josias.");
  });
});
