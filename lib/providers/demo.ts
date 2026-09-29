import "server-only";
import { advanceDemoRound, demoAnswer, demoRound } from "@/lib/demo/engine";
import { hash01 } from "@/lib/demo/catalog";
import type { AiSearchProvider, ProviderInput, ProviderOutput } from "@/lib/providers/common";
import { siteUrl } from "@/lib/site";
import { listActivePublicProfiles } from "@/lib/storage";
import type { ProviderName } from "@/lib/types";

export { advanceDemoRound };

/**
 * AIキー未設定の開発環境（lib/demo-mode.ts）で、3つのAIの代わりに模擬の答えを返す。
 * 答えは本物と同じ「候補N | 名前 | 理由」の形式なので、候補の読み取り・集計は本物の処理がそのまま動く。
 */
function demoProvider(name: ProviderName): AiSearchProvider {
  return {
    name,
    configured: () => true,
    async run(input: ProviderInput): Promise<ProviderOutput> {
      const brand = input.discovery.brandName;
      const published = (await listActivePublicProfiles().catch(() => [])).find((profile) => profile.brandName === brand);
      // 本物のAIのように少し待つ（進み具合の表示を確かめられるように）
      await new Promise((resolve) => setTimeout(resolve, 60 + Math.floor(hash01(`${input.prompt.id}|${name}`) * 140)));
      const answer = demoAnswer({
        prompt: input.prompt,
        discovery: input.discovery,
        provider: name,
        repetition: input.repetition,
        round: demoRound(brand),
        publishedUrl: published ? `${siteUrl}/ai/company/${encodeURIComponent(published.slug)}` : null,
      });
      return { ...answer, model: `demo-${name}`, costUsd: 0 };
    },
  };
}

export const demoProviders: AiSearchProvider[] = [demoProvider("openai"), demoProvider("gemini"), demoProvider("perplexity")];
