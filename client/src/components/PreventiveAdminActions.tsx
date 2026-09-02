import React from "react";
import { Ban, History, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type PreventiveAdminItem = {
  id: number;
  task: string;
  scheduledDate: Date | string | number;
  status: string;
};

type PreventiveAdminActionsProps = {
  canManage: boolean;
  items: PreventiveAdminItem[];
  selectedId: number | null;
  onSelectedIdChange: (id: number | null) => void;
  onEdit: (item: PreventiveAdminItem) => void;
  onAudit: (item: PreventiveAdminItem) => void;
  onCancel: (item: PreventiveAdminItem) => void;
};

function formatDate(value: Date | string | number) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PreventiveAdminActions({ canManage, items, selectedId, onSelectedIdChange, onEdit, onAudit, onCancel }: PreventiveAdminActionsProps) {
  if (!canManage) return null;
  const selected = items.find((item) => item.id === selectedId);

  return <Card data-testid="preventive-admin-actions" className="border-0 bg-orange-50/40 shadow-sm ring-1 ring-orange-200">
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#df6c18]">Ações do PCM</p>
          <p className="mt-1 text-sm text-slate-600">Selecione uma programação para editar, cancelar ou consultar as alterações.</p>
        </div>
        <select aria-label="Programação para ações administrativas" className="h-10 w-full rounded-xl border border-orange-200 bg-white px-3 text-sm xl:max-w-md" value={selectedId ?? ""} onChange={(event) => onSelectedIdChange(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Selecione uma programação</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.task} · {formatDate(item.scheduledDate)}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button size="sm" variant="outline" disabled={!selected || selected.status === "Cancelada"} onClick={() => selected && onEdit(selected)} className="h-10 rounded-lg bg-white"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
          <Button size="sm" variant="outline" disabled={!selected} onClick={() => selected && onAudit(selected)} className="h-10 rounded-lg bg-white"><History className="mr-1.5 h-3.5 w-3.5" /> Histórico</Button>
          <Button size="sm" variant="outline" disabled={!selected || selected.status === "Cancelada" || selected.status === "Concluída"} onClick={() => selected && onCancel(selected)} className="h-10 rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50"><Ban className="mr-1.5 h-3.5 w-3.5" /> Cancelar</Button>
        </div>
      </div>
    </CardContent>
  </Card>;
}
