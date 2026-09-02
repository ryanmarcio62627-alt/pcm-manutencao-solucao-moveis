import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const loginMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn() }));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: { auth: { local: { login: { useMutation: () => loginMutation } } } },
}));

import Login from "../client/src/pages/Login";
import { Input } from "../client/src/components/ui/input";
import { Textarea } from "../client/src/components/ui/textarea";
import { buttonVariants } from "../client/src/components/ui/button";

describe("legibilidade da tela de login", () => {
  it("exibe apenas Entrar em laranja, inclusive desabilitado", () => {
    const html = renderToStaticMarkup(React.createElement(Login, { onLoggedIn: vi.fn() }));

    expect(html).toContain(">Entrar</button>");
    expect(html).toContain("text-[#f47b20]");
    expect(html).toContain("disabled:text-[#f47b20]");
  });

  it("mantém contraste explícito nas variantes compartilhadas de Button", () => {
    expect(buttonVariants({ variant: "default" })).toContain("text-white");
    expect(buttonVariants({ variant: "destructive" })).toContain("text-white");
    expect(buttonVariants({ variant: "outline" })).toContain("text-slate-700");
    expect(buttonVariants({ variant: "ghost" })).toContain("text-slate-700");
    expect(buttonVariants({ variant: "link" })).toContain("text-[#df6c18]");
  });

  it("mantém texto escuro, fundo branco e placeholder legível nos campos do registro", () => {
    const html = renderToStaticMarkup(React.createElement("div", null,
      React.createElement(Input, { placeholder: "Tarefa preventiva" }),
      React.createElement(Textarea, { placeholder: "Observação da execução" }),
    ));

    expect(html).toContain("bg-white");
    expect(html).toContain("text-slate-900");
    expect(html).toContain("placeholder:text-slate-400");
  });
});
