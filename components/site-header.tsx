import Link from "next/link";
import { Brand } from "@/components/brand";

export type NavigationContext = { resultHref: string; profileHref: string; watchHref: string };

export function SiteHeader({ compact = false, context }: { compact?: boolean; context?: NavigationContext }) {
  if (!context) {
    // 申込ボタンを常に見せるため追従させる。結果・見守り画面（context あり）はページ内の次の一手を優先し、追従させない
    return (
      <header className={`site-header site-header--sticky ${compact ? "site-header-compact" : ""}`}>
        <div className="shell header-inner">
          <Brand />
          <nav className="header-nav" aria-label="主要ナビゲーション">
            <div className="header-nav-links">
              <Link href="/#how">しくみ</Link>
              <Link href="/result?sample=1" prefetch={false}>診断結果の見本</Link>
              <Link href="/pricing">料金</Link>
              <Link href="/#faq">よくある質問</Link>
            </div>
            <div className="header-nav-actions">
              <Link href="/login" className="header-login-link">ログイン</Link>
              <Link className="header-cta" href="/#start">無料で診断</Link>
            </div>
          </nav>
          <details className="mobile-menu">
            <summary>メニュー</summary>
            <nav aria-label="モバイルナビゲーション">
              <Link href="/#start">無料で診断</Link>
              <Link href="/#how">しくみ</Link>
              <Link href="/result?sample=1" prefetch={false}>診断結果の見本</Link>
              <Link href="/pricing">料金</Link>
              <Link href="/#faq">よくある質問</Link>
              <Link href="/login">ログイン</Link>
            </nav>
          </details>
        </div>
      </header>
    );
  }

  const links = [
    [context.resultHref, "① 診断結果"], [context.profileHref, "② 公開ページ"], [context.watchHref, "③ 毎週の見守り"],
  ];
  return (
    <header className={`site-header ${compact ? "site-header-compact" : ""}`}>
      <div className="shell header-inner">
        <Brand />
        <nav className="header-nav" aria-label="主要ナビゲーション">
          <div className="header-nav-links">
            {links.map(([href, label]) => <Link key={label} href={href} prefetch={false}>{label}</Link>)}
            <Link href="/pricing">料金</Link>
          </div>
          <div className="header-nav-actions">
            <Link href="/manage" className="header-manage-link">管理画面を開く</Link>
            <Link href="/login" className="header-login-link">
              ログイン
            </Link>
            <Link className="header-cta" href="/#start">
              無料診断
            </Link>
          </div>
        </nav>
        <details className="mobile-menu">
          <summary>メニュー</summary>
          <nav aria-label="モバイルナビゲーション">
            <Link href="/#start">無料で診断</Link>
            {links.map(([href, label]) => <Link key={label} href={href} prefetch={false}>{label}</Link>)}
            <Link href="/pricing">料金</Link>
            <Link href="/login">ログイン</Link>
            <Link href="/manage">管理画面を開く</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
