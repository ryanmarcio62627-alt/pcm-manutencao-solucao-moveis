import PDFDocument from "pdfkit";
import type { Request, Response } from "express";
import { getLocalSession } from "./localAuth";
import { getPcmSummary, listMachines, listPreventives } from "./db";

export async function handlePcmReport(req: Request, res: Response) {
  const session = await getLocalSession(req);
  if (!session) return res.status(401).json({ error: "Faça login para gerar o relatório." });
  if (session.role !== "pcm") return res.status(403).json({ error: "Relatório restrito ao PCM." });

  try {
    const [summary, machines, preventives] = await Promise.all([getPcmSummary(), listMachines(), listPreventives()]);
    const total = preventives.length;
    const done = preventives.filter((item) => item.status === "Concluída").length;
    const late = preventives.filter((item) => item.status === "Atrasada").length;
    const completion = total ? Math.round((done / total) * 100) : 0;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-pcm-${new Date().toISOString().slice(0, 10)}.pdf"`);
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    doc.pipe(res);
    doc.fillColor("#16243d").fontSize(20).font("Helvetica-Bold").text("RELATÓRIO GERENCIAL DO PCM");
    doc.fillColor("#df6c18").fontSize(10).font("Helvetica-Bold").text("SOLUÇÃO MÓVEIS MG");
    doc.moveDown(0.4).fillColor("#64748b").font("Helvetica").fontSize(9).text(`Período de análise: dados cadastrados até ${new Date().toLocaleDateString("pt-BR")}`);
    doc.moveDown(1).fillColor("#16243d").fontSize(13).font("Helvetica-Bold").text("Resumo executivo");
    doc.moveDown(0.35).font("Helvetica").fontSize(10).fillColor("#334155").text(`O plano preventivo possui ${total} atividade(s) cadastrada(s), distribuída(s) em ${machines.length} ativo(s). O cumprimento atual é de ${completion}%, com ${late} atividade(s) atrasada(s) e ${Math.round((summary.downtimeMinutes ?? 0) / 60)} hora(s) de parada registrada(s).`);

    doc.moveDown(1).font("Helvetica-Bold").fontSize(13).fillColor("#16243d").text("Indicadores principais");
    const metrics = [["Cumprimento das preventivas", `${completion}%`], ["Atividades atrasadas", String(late)], ["Horas paradas registradas", `${Math.round((summary.downtimeMinutes ?? 0) / 60)} h`], ["Máquinas cadastradas", String(machines.length)]];
    let y = doc.y + 10;
    metrics.forEach(([label, value], index) => {
      const x = 42 + (index % 2) * 260;
      const rowY = y + Math.floor(index / 2) * 45;
      doc.roundedRect(x, rowY, 240, 34, 6).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(label, x + 10, rowY + 7);
      doc.fillColor(index === 1 && late > 0 ? "#e11d48" : "#16243d").font("Helvetica-Bold").fontSize(14).text(value, x + 10, rowY + 17);
    });
    doc.y = y + 100;

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#16243d").text("Visão por setor");
    doc.moveDown(0.35);
    const lateBySector = new Map<string, number>();
    preventives.filter((item) => item.status === "Atrasada").forEach((item) => lateBySector.set(item.sector, (lateBySector.get(item.sector) ?? 0) + 1));
    summary.bySector.slice(0, 8).forEach((sector) => {
      doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`${sector.name}: ${sector.done} concluída(s), ${lateBySector.get(sector.name) ?? 0} atrasada(s), ${sector.downtimeMinutes} min de parada`);
    });

    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).fillColor("#16243d").text("Pontos de atenção por máquina");
    doc.moveDown(0.35);
    const lateByMachine = new Map<string, number>();
    preventives.filter((item) => item.status === "Atrasada").forEach((item) => lateByMachine.set(item.machineName, (lateByMachine.get(item.machineName) ?? 0) + 1));
    const machineRows = summary.byMachine.slice(0, 8).map((machine) => ({ ...machine, late: lateByMachine.get(machine.name) ?? 0 })).sort((a, b) => (b.downtimeMinutes + b.late * 60) - (a.downtimeMinutes + a.late * 60));
    if (!machineRows.length) doc.font("Helvetica").fontSize(9).fillColor("#64748b").text("Ainda não há preventivas cadastradas para gerar uma priorização por máquina.");
    machineRows.forEach((machine) => doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`${machine.name}: ${machine.done} concluída(s), ${machine.late} atrasada(s), ${machine.downtimeMinutes} min parados`));

    doc.moveDown(1.4).font("Helvetica").fontSize(8).fillColor("#94a3b8").text("Documento gerado pelo sistema PCM — Solução Móveis MG. Os indicadores refletem os registros existentes no banco de dados no momento da emissão.");
    doc.end();
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
