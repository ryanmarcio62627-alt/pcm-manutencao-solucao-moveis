import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalGreeting } from "../client/src/components/LocalGreeting";
import { createLocalToken, getLocalSession } from "./localAuth";

describe("troca de sessão local", () => {
  it("mantém o usuário correto ao alternar entre PCM e técnico", async () => {
    const ryanToken = await createLocalToken({ username: "ryan", role: "pcm" });
    expect(await getLocalSession({ headers: { cookie: `pcm_session=${ryanToken}` } })).toEqual({ username: "ryan", role: "pcm" });
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: "ryan" }))).toContain("Bom trabalho, Ryan.");

    const josiasToken = await createLocalToken({ username: "josias", role: "campo" });
    expect(await getLocalSession({ headers: { cookie: `pcm_session=${josiasToken}` } })).toEqual({ username: "josias", role: "campo" });
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: "josias" }))).toContain("Bom trabalho, Josias.");

    const ryanAgainToken = await createLocalToken({ username: "ryan", role: "pcm" });
    expect(await getLocalSession({ headers: { cookie: `pcm_session=${ryanAgainToken}` } })).toEqual({ username: "ryan", role: "pcm" });
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: "ryan" }))).toContain("Bom trabalho, Ryan.");
  });
});
