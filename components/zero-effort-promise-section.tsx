"use client";

export function ZeroEffortPromiseSection() {
  return (
    <section
      id="zero-effort-promise"
      className="zero-effort-promise-section shell"
      aria-label="手間を抑えてAI推薦の獲得を目指す仕組み"
      style={{
        margin: "36px auto 44px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          color: "#0f172a",
          padding: "clamp(28px, 4vw, 40px) clamp(20px, 3.5vw, 36px)",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* ヘッダー */}
        <div style={{ textAlign: "center", maxWidth: "820px", margin: "0 auto 32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              padding: "4px 12px",
              borderRadius: "4px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.05em",
              }}
            >
              社長の作業は、入力と初回の公開同意だけ
            </span>
          </div>
          <h2
            style={{
              fontSize: "clamp(1.35rem, 2.5vw, 1.95rem)",
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              margin: "0 0 14px",
              color: "#0f172a",
            }}
          >
            URLまたは社名の入力と、初回の公開同意だけ。<br />
            情報の整備と毎週の追跡を、すべてRovanに任せて本業へ。
          </h2>
          <p
            style={{
              fontSize: "0.92rem",
              color: "#475569",
              lineHeight: 1.75,
              margin: 0,
              maxWidth: "680px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            ホームページの改修も、サーバーの設定も、面倒なブログ更新も一切不要です。<br />
            <strong>専門知識や面倒なアンケート回答は不要。</strong> 公開情報からAI推薦データを自動構築し、初回の公開同意だけで配備完了。以降の毎週の承認は不要です。
          </p>
        </div>

        {/* 3つの理由（なぜURLだけでいいのか？） */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(270px, 100%), 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          {/* 理由 01 */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "0.05em",
                }}
              >
                01
              </span>
              <strong style={{ fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.4 }}>
                既存の公開情報から、選ばれる理由を自動抽出
              </strong>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
              URLまたは社名を起点に、専門分野・対応地域・利用条件など、御社がどんな相談に応えられるかを公開情報から自動整理。参照元にない架空の実績を追加することはありません。
            </p>
          </div>

          {/* 理由 02 */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "0.05em",
                }}
              >
                02
              </span>
              <strong style={{ fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.4 }}>
                自社サイトの改修は1文字も不要。AI専用ページを開設
              </strong>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
              既存の自社サイトは1文字も触る必要がありません。<br />
              AIが読み取れる確定仕様ページをRovan上に用意し、内容を確認して公開に同意すればすぐ公開できます。
            </p>
          </div>

          {/* 理由 03 */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "0.05em",
                }}
              >
                03
              </span>
              <strong style={{ fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.4 }}>
                毎週のAI回答追跡と、掲載データの自動調整
              </strong>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
              毎週同じ条件でAI回答の変化を自動追跡し、AIの回答傾向や自社情報の変化に合わせてRovan上の掲載データを調整します。社長が毎週チェックや承認をする手間は一切ありません。
            </p>
          </div>
        </div>

        {/* コミットメントメッセージバー */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#0f172a",
                background: "#e2e8f0",
                padding: "2px 8px",
                borderRadius: "3px",
                letterSpacing: "0.05em",
              }}
            >
              安心の約束
            </span>
            <span style={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
              <strong>社長は、本業（接客・施工・製造・経営）に100%専念してください。</strong><br />
              会社紹介文や自社サイトは書き換えません。無料公開は30日間。有料プランでは、掲載維持に同意した公開ページの有効期限を週次測定時に更新します。非公開にしたページや期限切れのページを勝手に再公開しません。
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#0f172a",
              background: "#e2e8f0",
              border: "1px solid #cbd5e1",
              padding: "4px 12px",
              borderRadius: "4px",
              letterSpacing: "0.04em",
            }}
          >
            入力: URLまたは社名
          </span>
        </div>
      </div>
    </section>
  );
}
