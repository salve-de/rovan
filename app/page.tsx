import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ScanForm } from "@/components/scan-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HeroChatDiagnosticCard, ProductOutputPreview, ProductProcessVisual, WatchTrendVisual } from "@/components/product-visuals";
import { VerifiedCompaniesGallery } from "@/components/verified-companies-gallery";
import { GoogleDeclineProblemSection } from "@/components/google-decline-problem-section";
import { FREE_PANEL_SIZE, CORE_PANEL_SIZE } from "@/lib/prompt-panels";
import { WATCH_MONTHLY_PRICE_LABEL } from "@/lib/pricing";

export default function HomePage() {
  return (
    <main className="landing-page">
      <SiteHeader />

      {/* ================================================================= */}
      {/* 1. ファーストビュー：スクロール不要・1画面完結型シングルフォーカスヒーロー */}
      {/* ================================================================= */}
      <section className="landing-hero">
        <div className="shell landing-hero-inner">
          <div className="landing-hero-single">
            <div className="landing-hero-head-block">
              <p className="overline">ChatGPT・生成AI おすすめ獲得システム</p>
              <h1>
                お客さんがChatGPTに「おすすめ」を聞いた時、<br />
                <em>あなたの会社ではなく、大手ばかり紹介されていませんか？</em>
              </h1>
              <p className="landing-hero-lead">
                ホームページの改修はもちろん、サイトをお持ちでない場合も新たな作成は不要です。お願いするのは、社名やURLの入力と、公開前の内容確認だけ。<br />
                ChatGPTなどのAIが御社をおすすめするための公開ページを整え、毎週の推薦状況を自動で追跡します。
              </p>

            </div>

            {/* 入力フォーム */}
            <div className="landing-hero-form-box" id="scan">
              <ScanForm hideExtraToggle />
            </div>

            {/* 3大安心マイクロコピー（丸ボタンを排した知的なインライン表示） */}
            <div className="hero-trust-row" aria-label="サービスの特長">
              <span className="trust-item">
                <svg className="trust-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8.5L6.5 12L13 4" />
                </svg>
                URL・社名だけで開始
              </span>
              <span className="trust-sep" aria-hidden="true">•</span>
              <span className="trust-item">
                <svg className="trust-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8.5L6.5 12L13 4" />
                </svg>
                HPの改修・開設も不要
              </span>
              <span className="trust-sep" aria-hidden="true">•</span>
              <span className="trust-item">
                <svg className="trust-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8.5L6.5 12L13 4" />
                </svg>
                完全無料（自動課金なし）
              </span>
            </div>

            {/* 入力後の流れ（誇張のない事実ベースの手順） */}
            <p className="hero-next-steps" style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "10px" }}>
              入力後は、公開ページの確認 → AIへの質問 → 結果の整理の順に自動で進みます。
            </p>

            {/* 調査対象AI（モデル番号なし・主要サービス名を堂々提示） */}
            <div className="hero-ai-targets-clean" aria-label="調査対象AI">
              <span className="ai-clean-caption">調査対象AI:</span>
              <span className="ai-clean-names">ChatGPT • Google Gemini • Perplexity</span>
            </div>

            {/* 診断見本リンク */}
            <div className="hero-sample-link-wrapper">
              <Link className="hero-sample-link" href="/result?sample=1">
                診断レポートの見本を見る <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. AI回答シミュレーション：一目でわかるビフォーアフター比較 */}
      {/* ================================================================= */}
      <section className="landing-simulation-section shell" style={{ paddingTop: "64px", paddingBottom: "64px" }}>
        <div className="section-head-center" style={{ marginBottom: "32px" }}>
          <span className="pill-badge">AI推薦の比較イメージ</span>
          <h2>お客さんがAIに相談した時、<br />回答はどう変わるのか？</h2>
          <p>
            ChatGPTやGeminiなど主要AIで、見込み客が相談した場合の回答例を比較。<br />
            お客さんの細かな条件に合う専門性で、御社が推薦候補に入る実例を比較します。以下はサンプルデータを使った表示例です。
          </p>
        </div>
        <div style={{ maxWidth: "880px", margin: "0 auto" }}>
          <HeroChatDiagnosticCard />
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. なぜ今、こんなことが起きているのか？（理由が1秒でわかる3大危機） */}
      {/* ================================================================= */}
      <GoogleDeclineProblemSection />

      {/* ================================================================= */}
      {/* 3. 何が手に入るか・どう進むか（2大成果物＋4ステップを1セクションに統合） */}
      {/* ================================================================= */}
      <section className="landing-deliverables-section shell" style={{ marginTop: "48px", marginBottom: "48px" }}>
        <div className="section-head-center" style={{ marginBottom: "32px" }}>
          <span className="pill-badge">手に入る2つの確定成果物</span>
          <h2>社名を入力するだけで、<br />手元に届く「2大成果物」</h2>
          <p>
            今のホームページの改修も、専門知識も一切不要です。<br />
            買い手が聞きそうな質問を設計し、複数のAIで実際に回答を確認。競合と比べて足りない情報を特定し、「推薦の現状がわかる診断レポート」と「そのまま使える完成文案付きの推薦データ」にまとめます。ページは初回の公開同意後に公開できます。
          </p>
          <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "10px" }}>
            診断（現状把握）→ 打ち手（完成文案の推薦データ）→ 毎週の再測定、の順で自動的に進みます。
          </p>
        </div>

        {/* 左右2大成果物プレミアムショーケース */}
        <div style={{ marginBottom: "40px" }}>
          <ProductOutputPreview />
        </div>

        {/* 進み方（4ステップ） */}
        <div className="section-head-center" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>どう進むか：4ステップ</h3>
        </div>
        <ProductProcessVisual />

        {/* 法的免責・客観性保証の注記 */}
        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#64748b", margin: "24px auto 0", maxWidth: "780px", lineHeight: 1.6 }}>
          ※ AI回答は質問や測定時点で変わります。変化は同じ条件で比較します。社長が行うのは、入力と公開前の内容確認だけです。
        </p>
      </section>

      {/* ================================================================= */}
      {/* 4. ウチの業種だとどうなる？（主要業種シミュレーション） */}
      {/* ================================================================= */}
      <VerifiedCompaniesGallery />

      {/* ================================================================= */}
      {/* 6. 継続的な安心と明朗価格（「これなら払うわ」の安心アンカー） */}
      {/* ================================================================= */}
      <section className="landing-watch-pricing-section shell" style={{ marginTop: "48px", marginBottom: "48px" }}>
        {/* 毎週の見守りビジュアル */}
        <div className="landing-watch-grid" style={{ marginBottom: "36px" }}>
          <WatchTrendVisual />
          <div className="section-intro">
            <span className="pill-badge">専属のAI見守り体制</span>
            <h2>AIの回答状況を、<br />毎週自動で追跡・チェック。</h2>
            <p>自社が候補に入った質問、競合だけが登場した質問を同じ条件で追跡。専門性や対応条件の伝え方を見直し、次の推薦獲得につなげるための候補を整理します。</p>
            <ul className="watch-feature-list">
              <li><strong>毎週の再測定</strong>：同じ質問パネルでAI回答の変化を確認</li>
              <li><strong>ライバル急浮上アラート</strong>：毎週の測定で、競合の推薦状況の変化をお知らせ</li>
              <li><strong>AI推薦データの自動更新</strong>：自社情報の変化やAIの回答傾向に合わせ、公開データを自動で最新化</li>
            </ul>
            <Link className="text-button" href="/watch?sample=1">追跡レポートの見本を見る <span aria-hidden="true">→</span></Link>
          </div>
        </div>

        {/* 明朗価格アンカーカード */}
        <div
          style={{
            background: "var(--bg-base, #ffffff)",
            border: "1px solid var(--border-subtle, #e2e8f0)",
            borderRadius: "var(--radius-card, 8px)",
            padding: "clamp(24px, 4vw, 40px)",
            boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 32px" }}>
            <span className="pill-badge">明朗・適正な価格設定</span>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: "0 0 10px", lineHeight: 1.35 }}>
              1日あたり約330円から始められる、<br />明朗な料金体系
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary, #475569)", margin: 0, lineHeight: 1.75 }}>
              ホームページの改修も、高額な初期費用も不要。まずは無料診断で現状を確かめ、必要な場合だけ週次の自動見守りを開始できます。
            </p>

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              maxWidth: "840px",
              margin: "0 auto",
            }}
          >
            {/* プラン 1：無料診断 */}
            <div
              style={{
                background: "var(--bg-surface, #f8fafc)",
                border: "1px solid var(--border-subtle, #e2e8f0)",
                borderRadius: "var(--radius-card, 8px)",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted, #64748b)", fontFamily: "var(--font-mono, monospace)", marginBottom: "6px" }}>
                現状把握とAI推薦データの作成
              </span>
              <h4 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: "0 0 12px" }}>
                無料AI推薦 診断レポート
              </h4>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>0円</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted, #64748b)" }}>（カード登録不要・自動課金なし）</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary, #475569)", lineHeight: 1.8, flex: 1 }}>
                <li>固定した{FREE_PANEL_SIZE}問の質問パネルでの診断レポート</li>
                <li>自社専用のAI推薦データ（自動下書き）</li>
                <li>ホームページの改修・新たな開設も不要</li>
                <li>クレジットカード登録不要・自動課金なし</li>
              </ul>
              <a
                href="#scan"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "var(--color-brand, #0f172a)",
                  color: "#ffffff",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  minHeight: "48px",
                  padding: "0 20px",
                  borderRadius: "var(--radius-btn, 6px)",
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
              >
                <span>まずは無料で診断してみる</span>
                <ArrowIcon />
              </a>
            </div>

            {/* プラン 2：週次測定 */}
            <div
              style={{
                background: "var(--bg-base, #ffffff)",
                border: "2px solid var(--color-brand, #0f172a)",
                borderRadius: "var(--radius-card, 8px)",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "-11px",
                  right: "20px",
                  background: "var(--color-brand, #0f172a)",
                  color: "#ffffff",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: "var(--radius-badge, 4px)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                おすすめ
              </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted, #64748b)", fontFamily: "var(--font-mono, monospace)", marginBottom: "6px" }}>
                継続運用・AI推薦の監視
              </span>
              <h4 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: "0 0 12px" }}>
                毎週の自動見守りプラン
              </h4>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>{WATCH_MONTHLY_PRICE_LABEL}</span>
              </div>
              <ul style={{ margin: "0 0 24px", paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary, #475569)", lineHeight: 1.8, flex: 1 }}>
                <li>最初の14日間は無料。期間終了後に自動で課金されることはありません</li>
                <li>1日約330円（税別9,800円・月単位でいつでも解約可能）</li>
                <li>自社サイトの改修不要・サイトをお持ちでない場合も開設不要</li>
                <li>固定{CORE_PANEL_SIZE}問のパネルで、自社が候補に入った割合を毎週追跡</li>
                <li>毎週の推薦状況を自動チェック・Rovan上の公開データを自動調整（毎週の承認は不要）</li>
              </ul>

              <Link
                href="/pricing"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "var(--bg-surface, #f8fafc)",
                  border: "1px solid var(--border-subtle, #cbd5e1)",
                  color: "var(--text-primary, #0f172a)",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  minHeight: "48px",
                  padding: "0 20px",
                  borderRadius: "var(--radius-btn, 6px)",
                  textDecoration: "none",
                }}
              >
                <span>料金プランの詳細を見る</span>
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.74rem", color: "#94a3b8", margin: "20px 0 0" }}>
            ※ クレジットカード登録は不要です。無料診断のあとに自動で課金されることは一切ありません。継続的な見守りをご希望の方のみお申し込みいただけます。
          </p>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. 最終アクション：迷わず押せるワンアクション */}
      {/* ================================================================= */}
      <section className="landing-final-cta">
        <div className="shell">
            <span className="pill-badge">URL・社名だけで開始。自社サイト改修ゼロ。</span>
            <h2>御社はAIから「おすすめ」されていますか？<br />まずは無料診断で、自社の現状をご確認ください。</h2>
          <ScanForm compact />
          <div className="hero-trust-badges" style={{ justifyContent: "center", marginTop: "18px" }} aria-label="サービスの特長">
            <div className="trust-badge">
              <svg className="badge-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" />
              </svg>
              <span>URLまたは社名を入力</span>
            </div>
            <div className="trust-badge">
              <svg className="badge-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" />
              </svg>
              <span>公開は初回の同意後</span>
            </div>
            <div className="trust-badge">
              <svg className="badge-check" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" />
              </svg>
              <span>完全無料・自動課金なし</span>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
