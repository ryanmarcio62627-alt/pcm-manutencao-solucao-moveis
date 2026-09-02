import { describe, expect, it } from "vitest";
import { validateLocalLogin } from "./localAuth";

describe("local password authentication", () => {
  it("accepts the configured PCM and field credentials", () => {
    const pcmPassword = process.env.PCM_ADMIN_PASSWORD;
    const fieldPassword = process.env.PCM_FIELD_PASSWORD;

    expect(pcmPassword).toBeTruthy();
    expect(fieldPassword).toBeTruthy();
    expect(validateLocalLogin("ryan", pcmPassword ?? "")).toEqual({ role: "pcm", username: "ryan" });
    expect(validateLocalLogin("campo", fieldPassword ?? "")).toEqual({ role: "campo", username: "campo" });
  });
});
