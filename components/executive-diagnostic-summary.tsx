"use client";

interface ExecutiveDiagnosticSummaryProps {
  brandName: string;
  topCompetitor?: string;
  lostCount?: number;
  totalCount?: number;
  scheduledCount?: number;
  partial?: boolean;
}

/**
 * 測定結果の要約カード。診断レポート本体（result-client.tsx）は①結論セクションで
 * 同等の情報をすでに示しているため、このコンポーネントは他ページから単体で
 * 要約を出したい場合向けの共通部品として維持する。
 */
export function ExecutiveDiagnosticSummary({
  brandName,
  topCompetitor,
  lostCount,
  totalCount,
  scheduledCount,
  partial,
}: ExecutiveDiagnosticSummaryProps) {
  const hasCounts = typeof lostCount === "number" && typeof totalCount === "number";
  const missing = Math.max(0, (scheduledCount || 0) - (totalCount || 0));

  return (
    <section id="executive-summary" className="exec-summary shell" aria-label="AI回答の測定要約">
      <div className="ui-card exec-summary-card">
        <div className="exec-summary-head">
          <span className="ui-badge">測定結果の要約</span>
          <span className="exec-summary-target">対象: <strong>{brandName}</strong></span>
        </div>

        <h2>
          {hasCounts && totalCount === 0
            ? "AI回答は未取得です。候補入り・候補外は未判定です。"
            : hasCounts
            ? <>今回の測定では、<strong>{lostCount}問 / 取得成功{totalCount}問</strong>で自社が候補外でした。</>
            : "今回のAI回答を確認しました。"}
        </h2>
        {partial ? <p className="exec-summary-partial">部分観測：予定{scheduledCount}問・未取得{missing}問。取得できた回答の多数決で集計し、AI別の固定50問指標とは区別します。</p> : null}
        <p className="exec-summary-note">
          これは指定した質問・AI・測定時点における観測結果です。実際の顧客数、問い合わせ、契約、売上や、AI全体の順位を示すものではありません。
        </p>

        <p className="exec-summary-competitor">
          {topCompetitor
            ? <>今回の回答で多く含まれた候補の例は「{topCompetitor}」です。これは測定ログ上の候補であり、他社の品質や市場全体の順位を評価するものではありません。</>
            : "今回の回答ログに候補を確認できませんでした。"}
        </p>
      </div>
    </section>
  );
}
