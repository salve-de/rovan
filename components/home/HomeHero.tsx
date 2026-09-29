import Image from "next/image";
import { ScanForm } from "@/components/scan-form";

const TRUST_ITEMS = ["登録・メール不要", "ホームページなしでもOK", "無料診断・自動課金なし"];

export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="shell home-hero-grid">
        <div className="home-hero-copy">
          <span className="home-hero-badge">ChatGPT・Gemini・Perplexity に対応</span>
          <h1 className="home-hero-title">
            AIに「おすすめは？」と
            <br />
            聞かれたとき、
            <br />
            御社の名前は<span className="home-hero-title-accent">出ていますか。</span>
          </h1>
          <div className="home-hero-lead">
            <p className="home-hero-lead-main">Rovanは、AIに御社をすすめてもらうためのサービスです。</p>
            <p className="home-hero-lead-sub">御社の強みをAIが読める形にまとめて公開し、毎週AIの答えを確かめます。ホームページがなくても使えます。</p>
          </div>
          <div id="start" className="home-hero-form">
            <ScanForm hideExtraToggle showLabel submitLabel="まずは無料で診断" placeholder="例: 青葉ベーカリー 高崎" label="社名・店名、Instagram、ホームページのどれか" />
          </div>
          <ul className="home-hero-trust">
            {TRUST_ITEMS.map((item) => (
              <li key={item}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7" /></svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="home-hero-art" aria-hidden="true">
          <div className="home-hero-art-inner">
            <Image className="home-hero-img-customer" src="/illustrations/customer-asks-ai.svg" alt="" width={470} height={470} priority />
            <div className="home-hero-bubble">
              <span className="home-hero-bubble-label">AIの答え</span>
              <span className="home-hero-bubble-title">大田区で試作を頼めるのは、この3社です。</span>
              <div className="home-hero-bubble-list">
                <span>1. 東都試作センター</span>
                <span>2. 中央精密加工</span>
                <span>3. 京浜メタルワークス</span>
              </div>
            </div>
            <Image className="home-hero-img-owner" src="/illustrations/owner-worried.svg" alt="" width={340} height={340} />
            <span className="home-hero-tag">うちの名前が、ない…</span>
          </div>
          <span className="home-hero-caption">イメージです</span>
        </div>
      </div>
    </section>
  );
}
