import Link from "next/link";
import { Brand } from "@/components/brand";

const SUPPORT_PATH = "/support";
const COMMERCE_PATH = "/commerce";

// クライアント画面からも使うため、サーバー専用の lib/legal は読まず、販売者情報の有無は呼び出し側から受け取る
export function SiteFooter({ watchToken = "", showSellerLinks = false }: { watchToken?: string; showSellerLinks?: boolean }) {
  return (
    <footer className="site-footer home-footer">
      <div className="shell home-footer-grid">
        <div className="home-footer-brand">
          <Brand />
          <p>AIに御社をすすめてもらうためのサービス。御社の強みをAIが読める形で公開し、毎週AIの答えを確かめます。</p>
        </div>
        <nav className="home-footer-col" aria-label="サービス">
          <strong>サービス</strong>
          <Link href="/#how">しくみ</Link>
          <Link href="/result?sample=1" prefetch={false}>診断結果の見本</Link>
          <Link href="/pricing">料金</Link>
          <Link href="/#faq">よくある質問</Link>
        </nav>
        <nav className="home-footer-col" aria-label="ご利用中の方">
          <strong>ご利用中の方</strong>
          <Link href="/login">ログイン</Link>
          <Link href="/manage">管理画面</Link>
          <Link href="/profile/manage">掲載内容の訂正・非公開</Link>
          <Link prefetch={false} href={watchToken ? `/data-rights?token=${encodeURIComponent(watchToken)}` : "/data-rights"}>データの管理</Link>
        </nav>
        <nav className="home-footer-col" aria-label="運営について">
          <strong>運営について</strong>
          {showSellerLinks ? <Link href={SUPPORT_PATH}>お問い合わせ</Link> : null}
          {showSellerLinks ? <Link href={COMMERCE_PATH}>特定商取引法に基づく表記</Link> : null}
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/terms">利用規約</Link>
        </nav>
      </div>
      <div className="shell home-footer-legal">
        <p>※ AIの推薦・順位・問い合わせ・売上を保証するものではありません。</p>
        <p>※ ChatGPTはOpenAI OpCo, LLC、GeminiはGoogle LLC、PerplexityはPerplexity AI, Inc.の商標または登録商標です。当サービスは各社との提携、公認、推奨関係を示すものではありません。</p>
        <p className="home-footer-copyright">© 2026 Rovan</p>
      </div>
    </footer>
  );
}
