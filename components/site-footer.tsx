import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter({ watchToken = "" }: { watchToken?: string }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>自社サイト改修ゼロで、御社の強みを伝えるAI推薦データを配備。AIからの推薦獲得に向けて、競合診断と毎週の自動見守りを行うシステムです。</p>
        </div>
        <nav aria-label="製品">
          <strong>製品</strong>
          <Link href="/result?sample=1">診断レポートの見本</Link>
          <Link href="/ai/company/aoba-souzoku?sample=1">AI推薦データの見本</Link>
          <Link href="/watch?sample=1">週次見守りの見本（推薦の変化）</Link>
          <Link href="/login">ログイン</Link>
          <Link href="/manage">管理画面を開く</Link>
          <Link href="/pricing">料金プラン</Link>
          <Link href="/methodology">調べ方</Link>
        </nav>
        <nav aria-label="サポート">
          <strong>サポート</strong>
          <Link href="/privacy">プライバシー</Link>
          <Link href="/terms">利用規約</Link>
          <Link prefetch={false} href={watchToken ? `/data-rights?token=${encodeURIComponent(watchToken)}` : "/data-rights"}>データ管理</Link>
          <Link href="/partners">パートナー制度</Link>
        </nav>
        <div className="footer-meta">
          <span>© 2026 Rovan</span>
        </div>
      </div>
      <div className="shell" style={{ borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "16px", marginTop: "24px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.6, margin: 0 }}>
          ※ ChatGPTはOpenAI OpCo, LLC、GeminiはGoogle LLC、PerplexityはPerplexity AI, Inc.、ClaudeはAnthropic PBCの商標または登録商標です。当サービスは各社との提携、公認、推奨関係を示すものではありません。
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.6, margin: 0 }}>
          ※ AIの推薦・順位・顧客獲得・売上は保証しません。
        </p>
      </div>
    </footer>
  );
}
