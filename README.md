# Rovan（ロヴァン）

正式サービス名は **Rovan**、日本語の読みは **ロヴァン**。名称と移行時の互換性は [改名記録](docs/ROVAN_BRAND_MIGRATION.md) を参照してください。

公開準備の修正・Safari実操作・未完了項目は [2026-09-07 リリース作業記録](docs/RELEASE_2026-09-07.md) を参照してください。コードの検証と本番公開は別です。現時点で本番公開・一般販売の完了を示す記録ではありません。

価値提案・北極星・許可に基づく自動更新の修復内容と未復旧機能は [2026-09-07 修復記録](docs/REPAIR_2026-09-07_PRODUCT_INTENT.md) を参照してください。

> **大手に埋もれず、専門性でAIのおすすめ獲得を目指す。自社サイト改修ゼロの情報補強・継続測定。**

---

## 現在のプロダクト契約

Rovanは、会社・商品・サービス名またはURLを起点に、自社のニッチな強みでAI推薦候補を取り戻すための情報補強・継続測定を提供します。全ユーザーの会話やAI内部順位を取得するものではありません。

- 実測値は、質問・AI・モデル・地域・言語・測定時点と、成功した観測数を添えて表示する。
- 会社名を入力した場合は、見つかった公開サイト候補を利用者が確認してから測定する。
- 初回の公開確認と許可後、有効な有料Watchは同じ参照元サイトの短い記載をRovan公開ページへ自動更新する。停止・直前取り消しが可能。自由文Change Packは下書きとして扱い、顧客サイトには書き込まない。
- 人間のASO/LLMO/GEOコンサルが行う質問設計、AI実測、競合・引用元分析、Evidence Gap判定、技術監査、優先順位付け、FAQ・比較文・記事・JSON-LD等の完成成果物生成、再測定・監視は、通常ケースをRovan内部で自動化する。顧客サイト/CMSへの最終反映だけはRovanの責務外とする。
- 公開情報は、参照元で確認できる事実と入力者が確認した内容に限定する。AIの推薦・順位・問い合わせ・売上は保証しない。
- 北極星はAI顧客奪還シェア（固定50問の候補入り割合）。WatchでAI別の成功分母・欠損・同条件の前後推移を示す。初回候補外からの回復率とは別であり、実際の顧客シェアではない。

現行の開発ルールは [`AGENTS.md`](AGENTS.md)、現行のプロダクト方針は [`docs/CORE_PRODUCT_STRATEGY.md`](docs/CORE_PRODUCT_STRATEGY.md)、人力ASO/LLMO業務を無人化する上位互換方針は [`docs/AUTONOMOUS_AI_SEARCH_SUPERSET_STRATEGY.md`](docs/AUTONOMOUS_AI_SEARCH_SUPERSET_STRATEGY.md)、継続測定の定義は [`docs/CONTINUOUS_VALUE_RETENTION.md`](docs/CONTINUOUS_VALUE_RETENTION.md) を参照してください。履歴・旧案はマスター白書とオーナー台帳に保存しています。

---

Rovan is an AI buyer-consideration improvement product for Japanese B2B companies.

It starts with a company, service, product name, or URL and answers the commercial question that matters before a buyer contacts sales:

> When a buyer asks ChatGPT or another AI to compare vendors, which buying questions exclude this company, which competitor is selected instead, what observable evidence explains the difference, what should the company change first, and did the same decision surface improve after that change?

The product loop is:

```text
FIND where the company is excluded
→ EXPLAIN who wins and why
→ ACT with a human-reviewable Change Pack
→ PROVE what moved under comparable remeasurement
```

Rovan does not treat Buyer Prompt counts as customers or revenue and does not claim a universal ChatGPT rank.

## Product flow

```text
Company / product name or URL
→ public-site candidate resolution when a name is entered
→ user confirms the public site to diagnose
→ bounded public-site crawl
→ company / brand / market / competitor discovery
→ Buyer Prompt panel
→ OpenAI / Gemini / Perplexity observations
→ shortlist outcomes and Citations
→ Evidence gaps and first Action
→ 14-day Watch
→ paid weekly remeasurement
→ Change Pack (title / lead / sections / FAQ / publish checks)
→ optional AI-readable public-information draft (`llms.txt` / JSON-LD)
→ next comparable measurement
```

## What is implemented

### Public product

- outcome-led landing page with a first-viewport fictional result;
- ungated scan from a company, service, product name, or URL;
- public-site candidate search for name input, with explicit candidate confirmation before crawling;
- streamed scan progress;
- fully fictional result and Watch samples;
- one-page result showing excluded Buyer Prompts, competitors, Citations, Evidence gaps and first Action;
- explicit bridge from diagnosis → Action → remeasurement;
- 14-day free Watch conversion;
- Watch focused on improvement verification rather than activity logging;
- paid Weekly Watch pricing and continuation;
- responsive desktop and mobile UI;
- pricing, methodology, privacy, terms and data-rights surfaces.

### Scan engine

- URL normalization and SSRF guards;
- DNS and redirect revalidation;
- path-aware robots policy;
- sitemap and bounded crawl;
- company, brand, market, buyer, use-case and competitor discovery;
- Buyer Prompt generation;
- OpenAI web-search adapter;
- Gemini Google Search grounding adapter;
- Perplexity Sonar adapter;
- raw answers and Citations;
- deterministic shortlist extraction;
- Recommendation Coverage, First Choice Rate, Mention Coverage, Citation Coverage, Repeat Agreement and Measurement Completeness;
- Evidence and Action analysis;
- partial-result handling;
- per-IP and per-domain free-scan limits.
- per-IP name-resolution limits to protect paid search usage.

### Watch, execution and billing

- private Watch token;
- baseline and weekly history;
- private company Evidence answers;
- comparable Core remeasurement;
- movement tracking for newly shortlisted / newly excluded Buyer Prompts;
- Change Pack generator using only public or company-asserted facts;
- persisted Change Pack on Watch;
- on-demand paid Change Pack endpoint;
- automatic Change Pack generation after paid Watch measurement when provider configuration is available;
- AI-readable public-information draft generated from crawled pages, with `llms.txt` and JSON-LD downloads;
- optional Rovan-hosted public company profile with preview, explicit publish/revoke, expiry, source links where available, HTML/JSON/Markdown output and a dedicated sitemap;
- market relation map, purchase-question demand proxy and page-level content-quality checks derived from the same public scan;
- AI visibility audit that checks crawler access, indexability, sitemap/canonical signals, page clarity, buyer facts, public proof and measurement completeness;
- stale Change Pack invalidation after Evidence updates;
- protected weekly scheduler route;
- Stripe Subscription Checkout;
- signed Stripe lifecycle webhook;
- Supabase persistence with local in-memory fallback.

Change Packs are drafts for human approval. Rovan does not directly publish to the customer site.

## Measurement boundary

Rovan reports an explicit observation panel. It does not claim an absolute position across every private AI conversation.

Free Scan:

```text
12 Buyer Prompts
× OpenAI / Gemini / Perplexity
× 1 repetition
= up to 36 observations
```

Paid Weekly Watch Core measurement:

```text
50 fixed Core Prompts
× OpenAI / Gemini / Perplexity
× 3 repetitions
= up to 450 observations per full Core run
```

Failed and unconfigured provider calls reduce Measurement Completeness. They are not counted as negative recommendations.

## Run the current implementation locally

The active implementation is on `feature/positioning-autopilot`, not `main`.

```bash
git clone https://github.com/salve-de/rovan.git
cd rovan
git checkout feature/positioning-autopilot
npm ci
cp .env.example .env.local
npm run dev -- -p 3001
```

Open:

```text
http://localhost:3001
http://localhost:3001/result?sample=1
http://localhost:3001/watch?sample=1
```

The fictional sample surfaces do not require provider credentials. A real URL scan requires the relevant provider configuration and must not be represented as verified until it has actually completed. Name input requires at least one configured public-search provider (OpenAI, Gemini, or Perplexity); the UI asks the user to confirm the returned public-site candidate before crawling.

## Environment

Use `.env.example` as the authoritative variable inventory. Do not commit secrets.

The product can use:

- OpenAI for discovery/search and Change Pack generation;
- Gemini and Perplexity for additional AI observation surfaces;
- Supabase for durable scan/Watch/rate-limit/run persistence;
- Stripe for paid Weekly Watch billing;
- mail configuration for Watch notifications where configured;
- `CRON_SECRET` for the protected Watch scheduler.

## Database

Apply every migration in `supabase/migrations/` in numeric order. Do not stop at the original core migrations; later migrations add Watch idempotency, Stripe identifiers, claim leases, durable measurement runs, finalize semantics and persisted Change Packs.

Current sequence includes `001_core.sql` through `011_privacy_delete.sql`.

Without Supabase, local development uses a single-process in-memory store. It is not suitable for multi-instance production.

## Autonomous Watch Scheduler

The repository includes a Cloud Run Jobs / Cloud Scheduler deployment path for long-running Watch measurements. Production deployment, quotas, parallelism and operating cost must be verified in the target Google Cloud project; the script alone is not deployment evidence.

```bash
# Deploy after verifying the target project, secrets, quotas and IAM
./scripts/deploy-cloud-run-job.sh

# Run locally or inside container:
npm run watch:job
```

## Validation

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

or:

```bash
npm run check
```

A passing check is required before claiming a code change is release-ready.

## Product decisions and research

- [`docs/PRODUCT_STRATEGY.md`](docs/PRODUCT_STRATEGY.md)
- [`docs/VALUE_PROPOSITION_RESEARCH_2026-09-02.md`](docs/VALUE_PROPOSITION_RESEARCH_2026-09-02.md)
- [`docs/UX_RATIONALE.md`](docs/UX_RATIONALE.md)
- [`docs/MEASUREMENT.md`](docs/MEASUREMENT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/CHAT_HANDOFF_2026-09-02.md`](docs/CHAT_HANDOFF_2026-09-02.md)
- [`docs/CHANGELOG_2026-09-06_FULL_AUDIT.md`](docs/CHANGELOG_2026-09-06_FULL_AUDIT.md) — 2026-09-06全体監査・修正・検証記録

## Safety and truth boundaries

- public `http` / `https` URLs only;
- internal and metadata targets rejected;
- `robots.txt` respected;
- private result and Watch routes are noindex/noarchive/no-referrer/no-store where applicable;
- missing credentials never produce fabricated live observations;
- company Evidence is private by default;
- Buyer Prompts are not customers or leads;
- no universal rank, recommendation, Citation, inquiry or revenue guarantee;
- no causal claim from a simple before/after movement;
- no invented customer results, implementation times, certifications or ROI;
- no direct customer-site/CMS write; Rovan may generate implementation-ready artifacts, but publication into external customer-controlled systems remains outside Rovan;
- AI-readable drafts are human-reviewed aids; they do not guarantee AI recommendation, citation or search ranking.
