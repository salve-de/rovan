"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/types";

type ReportActionsProps = {
  result: ScanResult;
  sample?: boolean;
};

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "rovan-report";
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function lostPromptCsv(result: ScanResult) {
  const rows = [
    ["名前が出なかった質問", "AIがすすめた会社", "AIが参考にしたページの数"],
    ...result.lostPrompts.map((loss) => [loss.prompt, loss.winner || "", loss.citations.length]),
  ];
  // BOM keeps Japanese labels readable when the CSV is opened directly in
  // spreadsheet apps that otherwise guess Shift_JIS.
  return `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function ReportActions({ result, sample = false }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);
  const filename = safeFilename(`rovan-${result.discovery.brandName}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <div className="report-actions" aria-label="結果を保存する">
    <span className="report-actions-label">保存する</span>
    {!sample ? <button type="button" onClick={() => void copyLink()}>{copied ? "✓ コピーしました" : "この結果のリンクをコピー"}</button> : null}
    <button type="button" onClick={() => window.print()}>印刷・PDF</button>
    <button type="button" onClick={() => download(`${filename}.csv`, lostPromptCsv(result), "text/csv;charset=utf-8")}>質問の一覧（CSV）</button>
  </div>;
}
