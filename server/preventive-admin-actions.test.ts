import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PreventiveAdminActions from "../client/src/components/PreventiveAdminActions";

const items = [{ id: 12, task: "Lubrificar guias", scheduledDate: new Date("2026-09-10T12:00:00Z"), status: "Programada" }];

const props = {
  items,
  selectedId: 12,
  onSelectedIdChange: () => undefined,
  onEdit: () => undefined,
  onAudit: () => undefined,
  onCancel: () => undefined,
};

describe("painel de ações da programação preventiva", () => {
  it("renderiza Editar, Histórico e Cancelar para o PCM", () => {
    const html = renderToStaticMarkup(React.createElement(PreventiveAdminActions, { ...props, canManage: true }));
    expect(html).toContain("Ações do PCM");
    expect(html).toContain("Editar");
    expect(html).toContain("Histórico");
    expect(html).toContain("Cancelar");
    expect(html).toContain("text-slate-900");
  });

  it("bloqueia Cancelar quando a preventiva está concluída", () => {
    const completed = { ...items[0], status: "Concluída" };
    const html = renderToStaticMarkup(React.createElement(PreventiveAdminActions, { ...props, items: [completed], canManage: true }));
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Cancelar<\/button>/);
  });

  it("não renderiza ações administrativas para a equipe de campo", () => {
    const html = renderToStaticMarkup(React.createElement(PreventiveAdminActions, { ...props, canManage: false }));
    expect(html).toBe("");
  });
});
