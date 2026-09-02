import { describe, expect, it } from "vitest";
import { localSessionQueryOptions } from "@shared/localSessionPolicy";

describe("sessão no mobile", () => {
  it("não refaz a sessão ao recuperar foco e permite reconexão controlada", () => {
    expect(localSessionQueryOptions.refetchOnWindowFocus).toBe(false);
    expect(localSessionQueryOptions.refetchOnReconnect).toBe(true);
    expect(localSessionQueryOptions.retry).toBe(1);
  });
});
