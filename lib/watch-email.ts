import { brandedEmailSender } from "@/lib/brand";
import "server-only";
import { northStarShare } from "@/lib/north-star";
import { compareMeasurementReadouts, measurementReadout } from "@/lib/measurement-readout";
import { env } from "@/lib/env";
import { shortHash } from "@/lib/ids";
import type { ScanResult, WatchRecord } from "@/lib/types";

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE[character] || character);
}

function cleanSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
}

function watchUrl(watch: WatchRecord) {
  return `${env.siteUrl.replace(/\/$/, "")}/watch?token=${encodeURIComponent(watch.token)}`;
}

function countableObservation(result: ScanResult) {
  return result.observations.filter((observation) => observation.status === "success");
}


function answerObservationCount(result: ScanResult) {
  const successful = countableObservation(result).length;
  const scheduled = Math.max(result.scheduledObservations || 0, successful);
  return { successful, scheduled };
}

function citationUrls(result: ScanResult) {
  return new Set(
    countableObservation(result)
      .flatMap((observation) => observation.citations || [])
      .map((citation) => citation.url || citation.domain)
      .filter(Boolean)
  );
}


function tableRow(label: string, value: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${escapeHtml(value)}</td></tr>`;
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string; idempotencyKey: string }) {
  if (!input.to || !input.to.trim()) return { sent: false as const, reason: "no_recipient" };
  if (!env.resendApiKey || !env.watchFromEmail) return { sent: false as const, reason: "unconfigured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.resendApiKey}`,
        "content-type": "application/json",
        "idempotency-key": input.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({ from: brandedEmailSender(env.watchFromEmail), to: [input.to], subject: cleanSubject(input.subject), text: input.text, html: input.html }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Watch email delivery failed", response.status, body.slice(0, 240));
      return { sent: false as const, reason: `resend_${response.status}` };
    }
    const data = await response.json().catch(() => ({})) as { id?: string };
    return { sent: true as const, id: data.id || "sent" };
  } catch (error) {
    console.error("Watch email delivery failed", error instanceof Error ? error.message : String(error));
    return { sent: false as const, reason: "network_error" };
  }
}

function jstDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(value));
  } catch { return value; }
}

function providerName(provider: string) {
  return provider === "openai" ? "ChatGPT" : provider === "gemini" ? "Gemini" : provider === "perplexity" ? "Perplexity" : provider;
}

function emailHtml(heading: string, body: string, url: string, footer = "") {
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;line-height:1.65;max-width:620px"><p style="font-size:12px;letter-spacing:.08em;color:#64748b">Rovan</p><h1 style="font-size:22px;margin:8px 0 20px">${escapeHtml(heading)}</h1>${body}<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b1b2a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">結果を見る</a></p>${footer ? `<p style="font-size:12px;color:#64748b;margin-top:24px">${escapeHtml(footer)}</p>` : ""}</div>`;
}

export async function sendWatchStarted(watch: WatchRecord) {
  const result = watch.latest;
  const brand = result.discovery.brandName;
  const url = watchUrl(watch);
  const readout = measurementReadout(result);
  const citations = citationUrls(result).size;
  const lost = readout.successful ? `${readout.excluded} / ${readout.successful}問` : "未測定";
  const heading = `${brand}の見守りを始めました。`;
  const lead = `毎週、同じ${result.panel.promptCount}問をAIに聞いて、御社の名前が出るかを確かめます。`;
  const footer = "最初の14日間は無料です。自動で課金はされません。";
  const subject = `[Rovan] ${heading}`;
  const text = `${heading}\n${lead}\n\n名前が出た質問：${readout.label}\n名前が出なかった質問：${lost}\nAIが参考にしたページ：${citations}件\n\n結果を見る：${url}\n\n${footer}`;
  const rows = [
    tableRow("名前が出た質問", readout.label),
    tableRow("名前が出なかった質問", lost),
    tableRow("AIが参考にしたページ", `${citations}件`),
  ].join("");
  const html = emailHtml(heading, `<p>${escapeHtml(lead)}</p><table style="border-collapse:collapse;width:100%;margin:0 0 24px">${rows}</table>`, url, footer);
  return sendEmail({ to: watch.email, subject, text, html, idempotencyKey: `watch-start/${watch.id}` });
}

export async function sendWatchUpdate(watch: WatchRecord, previous: ScanResult, options: { trialEnded?: boolean } = {}) {
  const latest = watch.latest;
  const northStar = northStarShare(latest, watch.baseline);
  // AI顧客奪還シェアは50問で測っているときだけ載せる（AIごとに分けて書く）
  const northStarText = northStar.status === "short-panel" ? "" : `AI顧客奪還シェア（50問のうち、名前が出た質問の割合）\n${northStar.providers.map((row) => `${providerName(row.provider)}：${row.value === null ? "未測定" : `${row.value}%`}（${row.included}/${row.successful}問${row.missing ? `・${row.missing}問は取得できず` : ""}）${row.comparison ? `　同じ${row.comparison.count}問で ${row.comparison.before}% → ${row.comparison.after}%` : ""}`).join("\n")}`;
  const brand = latest.discovery.brandName;
  const url = watchUrl(watch);
  const readout = compareMeasurementReadouts(previous, latest);
  const comparable = readout.comparable;
  const comparisonNote = readout.note.replace("初回", "前回");
  const previousIncluded = readout.before.included;
  const latestIncluded = readout.after.included;
  const newIncluded = readout.wins.length;
  const newlyExcludedCount = readout.losses.length;
  const previousCitations = citationUrls(previous);
  const latestCitations = citationUrls(latest);
  const addedCitations = [...latestCitations].filter((citation) => !previousCitations.has(citation)).length;
  const removedCitations = [...previousCitations].filter((citation) => !latestCitations.has(citation)).length;
  const previousObservations = answerObservationCount(previous);
  const latestObservations = answerObservationCount(latest);
  const observationCountChanged = previousObservations.successful !== latestObservations.successful
    || previousObservations.scheduled !== latestObservations.scheduled;
  const meaningfulChange = options.trialEnded
    || readout.meaningful
    || newIncluded > 0
    || newlyExcludedCount > 0
    || addedCitations > 0
    || removedCitations > 0
    || observationCountChanged;
  if (!meaningfulChange) return { sent: false as const, reason: "no_meaningful_change" as const };
  const heading = options.trialEnded
    ? `${brand}の無料期間（14日間）が終了しました。`
    : !comparable
      ? `${brand}：今週は前回とくらべられませんでした。`
      : newIncluded > 0
        ? `${brand}：${newIncluded}問で、新しく名前が出ました。`
        : newlyExcludedCount > 0
          ? `${brand}：${newlyExcludedCount}問で、名前が出なくなりました。`
          : readout.answerChanged
            ? `${brand}：AIがすすめる会社が変わりました。`
            : `${brand}：AIが参考にしたページが変わりました。`;
  const rivals = readout.competitorMovements.filter((row) => row.name !== brand && (row.newcomer || row.departed || row.diff));
  const competitorText = readout.answerChanged && rivals.length ? `AIがすすめた会社の変化\n${rivals.map((row) => `${row.name}: ${row.newcomer ? "今回はじめて" : row.departed ? "今回は出ず" : `${row.baselineCoverage}% → ${row.latestCoverage}%`}`).join("\n")}` : "";
  const subject = `[Rovan] ${heading}`;
  const footer = options.trialEnded ? "今回で14日間の無料期間が終わりました。自動で課金はされません。" : "";
  const latestAction = watch.autoActions?.find((action) => (action.status === "planned" || action.status === "applied") && action.factValue && action.sourceUrl);
  const actionHeading = latestAction?.status === "applied" ? "公開ページを更新しました" : "公開ページの更新案をつくりました（まだ公開していません）";
  const actionTime = latestAction ? jstDate((latestAction.status === "applied" ? latestAction.executedAt : latestAction.plannedAt) || "") : "";
  const latestImpact = watch.autoActionImpacts?.[0];
  const actionText = latestAction ? `\n\n${actionHeading}${actionTime ? `（${actionTime}）` : ""}\n${latestAction.factLabel}：${latestAction.factValue}\n出典：${latestAction.sourceUrl}` : "";
  const impactText = comparable && latestImpact ? `\n更新した情報に関係する${latestImpact.affectedPromptCount}問で、名前が出た答え：${signed(latestImpact.observedUplift)}件` : "";

  const lines = comparable
    ? [
        `名前が出た質問：${previousIncluded} → ${latestIncluded}（${latest.panel.promptCount}問中）`,
        `名前が出なかった質問：${readout.before.excluded} → ${readout.after.excluded}`,
        ...(newIncluded ? [`新しく名前が出た質問：${newIncluded}問`] : []),
        ...(newlyExcludedCount ? [`名前が出なくなった質問：${newlyExcludedCount}問`] : []),
      ]
    : [comparisonNote];
  if (addedCitations || removedCitations) lines.push(`AIが参考にしたページ：${addedCitations}件ふえて、${removedCitations}件へりました`);
  if (observationCountChanged) lines.push(`AIの答えを取得できた数：前回 ${previousObservations.successful}/${previousObservations.scheduled}件 → 今回 ${latestObservations.successful}/${latestObservations.scheduled}件`);
  const readoutText = `前回（${jstDate(previous.measuredAt)}）：${readout.before.label}\n今回（${jstDate(latest.measuredAt)}）：${readout.after.label}`;
  const blocks = [heading, lines.join("\n"), readoutText, competitorText, northStarText].filter(Boolean);
  const text = `${blocks.join("\n\n")}${impactText}${actionText}\n\n結果を見る：${url}\n通知を止める・通知先を変える：${url}${footer ? `\n\n${footer}` : ""}`;

  const rows = comparable
    ? [
        tableRow("名前が出た質問", `${previousIncluded} → ${latestIncluded}（${latest.panel.promptCount}問中）`),
        tableRow("名前が出なかった質問", `${readout.before.excluded} → ${readout.after.excluded}`),
        ...(addedCitations || removedCitations ? [tableRow("AIが参考にしたページ", `+${addedCitations}件 / -${removedCitations}件`)] : []),
      ].join("")
    : tableRow("前回との比較", comparisonNote);
  const extra = [readoutText, competitorText, northStarText].filter(Boolean).map((block) => `<p style="white-space:pre-line;font-size:14px;color:#334155">${escapeHtml(block)}</p>`).join("");
  const actionHtml = latestAction ? `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:14px 18px;margin:20px 0"><strong style="font-size:14px">${escapeHtml(actionHeading)}</strong>${actionTime ? `<p style="font-size:12px;color:#64748b;margin:4px 0">${escapeHtml(actionTime)}</p>` : ""}<p style="margin:8px 0 4px;font-size:13px"><strong>${escapeHtml(latestAction.factLabel)}：</strong>${escapeHtml(latestAction.factValue)}</p><p style="margin:4px 0;font-size:13px">出典：${escapeHtml(latestAction.sourceUrl)}</p></div>` : "";
  const impactHtml = impactText ? `<p style="font-size:13px;color:#334155">${escapeHtml(impactText.trim())}</p>` : "";
  const html = emailHtml(heading, `<table style="border-collapse:collapse;width:100%;margin:0 0 16px">${rows}</table>${extra}${impactHtml}${actionHtml}<p style="font-size:12px"><a href="${escapeHtml(url)}">通知を止める・通知先を変える</a></p>`, url, footer);
  return sendEmail({ to: watch.email, subject, text, html, idempotencyKey: `watch-update/${watch.id}/${shortHash(latest.measuredAt)}` });
}
