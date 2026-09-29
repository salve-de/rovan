import "server-only";
import { id } from "@/lib/ids";
import { extractRecommendedEntities } from "@/lib/entity-extraction";
import type { BuyerPrompt, CompanyDiscovery, Observation } from "@/lib/types";
import type { AiSearchProvider } from "@/lib/providers/common";
import { observationFromFailure, runWithTimeout } from "@/lib/providers/common";
import { env } from "@/lib/env";
import { openAiProvider } from "@/lib/providers/openai";
import { geminiProvider } from "@/lib/providers/gemini";
import { perplexityProvider } from "@/lib/providers/perplexity";
import { demoProviders } from "@/lib/providers/demo";
import { demoMode } from "@/lib/demo-mode";

export const providers: AiSearchProvider[] = [openAiProvider, geminiProvider, perplexityProvider];

/** AIキー未設定の開発環境では模擬の答えを返すAIに差し替える（lib/demo-mode.ts） */
function activeProviders() {
  return demoMode() ? demoProviders : providers;
}

function providerModelName(provider: string) {
  if (provider === "openai") return env.openAiSearchModel;
  if (provider === "gemini") return env.geminiModel;
  if (provider === "perplexity") return env.perplexityModel;
  return `${provider}-search`;
}

export async function runObservationPanel(input: {
  prompts: BuyerPrompt[];
  discovery: CompanyDiscovery;
  repetitions: number;
  concurrency?: number;
  existingObservations?: Observation[];
  onCheckpoint?: (observations: Observation[]) => Promise<void>;
  onProgress?: (completed: number, total: number, detail: string) => Promise<void> | void;
}) {
  const key = (row: Pick<Observation, "promptId" | "provider" | "repetition">) => `${row.promptId}:${row.provider}:${row.repetition}`;
  const existing = new Map((input.existingObservations || []).map((row) => [key(row), row]));
  const allTasks = input.prompts.flatMap((prompt) =>
    activeProviders().flatMap((provider) =>
      Array.from({ length: input.repetitions }, (_, index) => ({
        prompt,
        provider,
        repetition: index + 1,
      }))
    )
  );

  const tasks = allTasks.filter(({ prompt, provider, repetition }) => !existing.has(key({ promptId: prompt.id, provider: provider.name, repetition })));
  const observations: Observation[] = allTasks.flatMap(({ prompt, provider, repetition }) => {
    const row = existing.get(key({ promptId: prompt.id, provider: provider.name, repetition }));
    return row ? [row] : [];
  });
  let completed = observations.length;
  const concurrency = Math.min(12, Math.max(1, Math.floor(input.concurrency || 6)));

  for (let offset = 0; offset < tasks.length; offset += concurrency) {
    const batch = tasks.slice(offset, offset + concurrency);
    const rows = await Promise.all(
      batch.map(async ({ prompt, provider, repetition }) => {
        const providerInput = { prompt, discovery: input.discovery, repetition };
        const startedAt = new Date().toISOString();
        const start = Date.now();

        if (!provider.configured()) {
          return observationFromFailure(providerInput, provider.name, providerModelName(provider.name), `${provider.name}のAPI設定がありません。`);
        }

        try {
          const output = await runWithTimeout((signal) => provider.run({ ...providerInput, signal }), 30_000);
          if (!output.rawText.trim()) throw new Error("AI Provider returned an empty answer");
          const recommendedEntities = extractRecommendedEntities(output.rawText, input.discovery);
          const ownPositionIndex = recommendedEntities.indexOf(input.discovery.brandName);

          return {
            id: id("obs"),
            promptId: prompt.id,
            prompt: prompt.text,
            provider: provider.name,
            model: output.model || providerModelName(provider.name),
            repetition,
            status: "success" as const,
            rawText: output.rawText,
            citations: output.citations,
            recommendedEntities,
            ownRecommended: ownPositionIndex >= 0,
            ownPosition: ownPositionIndex >= 0 ? ownPositionIndex + 1 : null,
            firstCandidate: recommendedEntities[0] || null,
            startedAt,
            completedAt: new Date().toISOString(),
            latencyMs: Date.now() - start,
            inputTokens: output.inputTokens,
            outputTokens: output.outputTokens,
            searchRequests: output.searchRequests,
            costUsd: output.costUsd,
          } satisfies Observation;
        } catch (error) {
          return observationFromFailure(providerInput, provider.name, providerModelName(provider.name), error);
        }
      })
    );

    observations.push(...rows);
    await input.onCheckpoint?.([...observations]);
    completed += rows.length;
    await input.onProgress?.(completed, allTasks.length, rows.map((row) => row.provider).join(" / "));
  }

  return observations;
}
