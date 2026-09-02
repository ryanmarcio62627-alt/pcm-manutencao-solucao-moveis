import { describe, expect, it } from "vitest";
import { formatLocalUserName } from "../shared/displayName";

describe("nome do usuário na saudação", () => {
  it("formata o nome do login individual e preserva o PCM", () => {
    expect(formatLocalUserName("ryan")).toBe("Ryan");
    expect(formatLocalUserName("josias")).toBe("Josias");
    expect(formatLocalUserName("joao.silva")).toBe("Joao Silva");
  });
});
