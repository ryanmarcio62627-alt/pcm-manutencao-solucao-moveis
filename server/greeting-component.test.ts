import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalGreeting } from "../client/src/components/LocalGreeting";

describe("saudação renderizada", () => {
  it("usa o nome da sessão em vez de um nome fixo", () => {
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: "ryan" }))).toContain("Bom trabalho, Ryan.");
    expect(renderToStaticMarkup(createElement(LocalGreeting, { username: "josias" }))).toContain("Bom trabalho, Josias.");
  });
});
