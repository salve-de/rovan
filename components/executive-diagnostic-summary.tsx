"use client";

interface ExecutiveDiagnosticSummaryProps {
  brandName: string;
  topCompetitor?: string;
  lostCount?: number;
  totalCount?: number;
  scheduledCount?: number;
  partial?: boolean;
}

export function ExecutiveDiagnosticSummary({
  brandName,
  topCompetitor,
  lostCount,
  totalCount,
  scheduledCount,
  partial,
}: ExecutiveDiagnosticSummaryProps) {
  const hasCounts = typeof lostCount === "number" && typeof totalCount === "number";

  return (
    <section
      id="executive-summary"
      className="executive-summary-section shell"
      aria-label="AI回答の測定要約"
      style={{ marginTop: "28px", marginBottom: "36px" }}
    >
      <div
        className="shadow-ambient-md"
        style={{
          background: "var(--bg-base, #ffffff)",
          borderRadius: "14px",
          color: "var(--text-primary, #0f172a)",
          padding: "clamp(24px, 3.5vw, 36px)",
          border: "1px solid var(--border-subtle, #e2e8f0)",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ background: "var(--bg-surface, #f1f5f9)", color: "var(--navy, #0f172a)", fontSize: "0.72rem", fontWeight: 800, padding: "3px 10px", borderRadius: "4px", border: "1px solid var(--border-subtle, #e2e8f0)", letterSpacing: "0.04em" }}>
              測定結果の要約
            </span>
            <span style={{ color: "var(--text-muted, #64748b)", fontSize: "0.82rem", fontWeight: 600 }}>AI推薦の獲得に向けた現状診断</span>
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-secondary, #475569)", background: "var(--bg-surface, #f8fafc)", border: "1px solid var(--border-subtle, #e2e8f0)", padding: "4px 12px", borderRadius: "6px" }}>
            対象: <strong style={{ color: "var(--navy, #0f172a)" }}>{brandName}</strong>
          </div>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "clamp(1.25rem, 2.4vw, 1.65rem)", fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.025em", margin: "0 0 10px", color: "var(--navy, #0f172a)" }}>
            {hasCounts && totalCount === 0 ? "AI回答は未取得です。候補入り・候補外は未判定です。" : hasCounts ? <>今回の測定では、<strong>{lostCount}問 / 取得成功{totalCount}問</strong>で自社が候補外でした。</> : "今回のAI回答を確認しました。"}
          </h2>
          {partial ? <p>部分観測：予定{scheduledCount}問・未取得{Math.max(0, (scheduledCount || 0) - (totalCount || 0))}問。取得できた回答の多数決で集計し、AI別の固定50問指標とは区別します。</p> : null}
          <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--text-secondary, #475569)", lineHeight: 1.75 }}>
            これは指定した質問・AI・測定時点における観測結果です。実際の顧客数、問い合わせ、契約、売上や、AI全体の順位を示すものではありません。
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div className="shadow-ambient-sm" style={{ background: "var(--bg-surface, #f8fafc)", border: "1px solid var(--border-subtle, #e2e8f0)", borderRadius: "10px", padding: "22px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <strong style={{ fontSize: "0.98rem", color: "var(--navy, #0f172a)", lineHeight: 1.4 }}>次に確認すること</strong>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary, #475569)", lineHeight: 1.7, margin: 0 }}>
              週次見守りに登録すると、毎週同じ質問で自社が候補に入ったかどうかの推移を追えます。
            </p>
          </div>
          <div className="shadow-ambient-sm" style={{ background: "var(--bg-surface, #f8fafc)", border: "1px solid var(--border-subtle, #e2e8f0)", borderRadius: "10px", padding: "22px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <strong style={{ fontSize: "0.98rem", color: "var(--navy, #0f172a)", lineHeight: 1.4 }}>今回確認できた候補</strong>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary, #475569)", lineHeight: 1.7, margin: 0 }}>
              {topCompetitor ? `今回の回答で多く含まれた候補の例は「${topCompetitor}」です。これは測定ログ上の候補であり、他社の品質や市場全体の順位を評価するものではありません。` : "今回の回答ログに候補を確認できませんでした。"}
            </p>
          </div>
        </div>

        <div id="executive-summary-comparison">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--navy, #0f172a)" }}>公開情報整理の前後で変わる作業</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            <div className="shadow-ambient-sm" style={{ background: "#fafafa", border: "1px solid var(--border-subtle, #e2e8f0)", borderRadius: "10px", padding: "20px" }}>
              <span style={{ color: "#dc2626", fontWeight: 800, fontSize: "0.78rem", background: "#fef2f2", border: "1px solid #fee2e2", padding: "2px 8px", borderRadius: "4px" }}>整理前</span>
              <ul style={{ margin: "12px 0 0", paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary, #475569)", lineHeight: 1.7 }}>
                <li>名称・分野・条件が複数ページに分かれている</li>
                <li>どの情報を参照したかをたどりにくい</li>
                <li>AI回答の変化を同じ条件で比べにくい</li>
              </ul>
            </div>
            <div className="shadow-ambient-sm" style={{ background: "var(--bg-base, #ffffff)", border: "1px solid #86efac", borderRadius: "10px", padding: "20px", boxShadow: "0 2px 8px rgba(34, 197, 94, 0.08)" }}>
              <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "0.78rem", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "4px" }}>整理後</span>
              <ul style={{ margin: "12px 0 0", paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-primary, #1e293b)", lineHeight: 1.7 }}>
                <li>確認できた事実を参照元付きで一つに整理</li>
                <li>未確認の料金・資格・実績などは追加しない</li>
                <li>公開後の回答変化を同じ条件で再測定する</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--border-subtle, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ fontSize: "0.84rem", color: "var(--text-secondary, #475569)" }}>AI推薦データの下書きは、内容を確認してから公開できます。</div>
          <a href="#step-2" style={{ background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", color: "#ffffff", fontSize: "0.82rem", fontWeight: 700, padding: "9px 18px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", boxShadow: "0 2px 4px rgba(15, 23, 42, 0.16)", transition: "all 0.15s ease" }}>
            AI推薦データの下書きを見る <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
