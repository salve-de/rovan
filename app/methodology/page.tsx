import Image from "next/image";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { PageSection } from "@/components/page/page-section";
import { CtaBand } from "@/components/page/cta-band";
import { CORE_PANEL_SIZE, FREE_PANEL_SIZE } from "@/lib/prompt-panels";

export const metadata: Metadata = {
  title: "調べ方",
  description: "Rovanの調べ方。お客さんがAIに聞きそうな質問を、ChatGPT・Gemini・Perplexityに同じ条件で聞き、御社の名前が出たかを数えます。",
};

const steps = [
  { title: "質問をつくる", body: "お客さんがAIに聞きそうな質問を、御社の分野と地域からつくります。" },
  { title: "3つのAIに聞く", body: "ChatGPT・Gemini・Perplexityに、同じ質問を同じ条件で聞きます。" },
  { title: "名前が出たかを数える", body: "答えに御社の名前が出たか、先にすすめられた会社はどこかを記録します。" },
];

export default function MethodologyPage() {
  return (
    <MarketingShell layout="sections" art={<Image src="/illustrations/forecast-data.svg" alt="" width={300} height={300} priority />} title="調べ方">
      <PageSection tone="white" title="3つのステップ">
        <ol className="mt-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="mt-step-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-panels">
          <div><span>無料診断</span><strong>{FREE_PANEL_SIZE}問</strong><p>1回だけ調べます。</p></div>
          <div><span>毎週の見守り（有料）</span><strong>{CORE_PANEL_SIZE}問</strong><p>同じ{CORE_PANEL_SIZE}問を毎週調べます。</p></div>
        </div>
      </PageSection>

      <PageSection tone="tint" title="毎週お届けする数字">
        <div className="mt-formula" aria-label="計算式">
          <div><span>名前が出た質問</span><strong>14</strong></div>
          <b aria-hidden="true">÷</b>
          <div><span>質問の数</span><strong>{CORE_PANEL_SIZE}</strong></div>
          <b aria-hidden="true">＝</b>
          <div className="mt-formula-result"><span>AI顧客奪還シェア</span><strong>28%</strong></div>
        </div>
        <p className="mt-formula-note">数字は見本です。</p>
      </PageSection>

      <PageSection tone="white" title="御社の結果を見る">
        <CtaBand />
      </PageSection>
    </MarketingShell>
  );
}
