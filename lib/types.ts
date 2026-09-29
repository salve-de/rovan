export type ProviderName = "openai" | "gemini" | "perplexity";
export type ScanStage = "created" | "validating" | "crawling" | "discovering" | "prompting" | "measuring" | "analyzing" | "complete" | "partial" | "failed";
export type PromptPanelKind = "free" | "core" | "discovery";
export type PromptCluster = "category" | "segment" | "use_case" | "feature" | "alternative" | "comparison" | "value" | "implementation" | "trust" | "support";
export type BuyerPromptIntent = "discover" | "compare" | "evaluate" | "switch" | "implement";
export type BuyerPromptStage = "認知" | "比較" | "検討" | "導入";

export type Citation = {
  /** Explicit answer citation versus retrieved search source; legacy values remain unknown. */
  kind?: "answer" | "search";
  title: string;
  url: string;
  domain: string;
};

export type CrawledPage = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
  canonicalUrl?: string;
  robotsDirectives?: string;
  noindex?: boolean;
  hasStructuredData?: boolean;
  structuredDataTypes?: string[];
  structuredDataMatchesVisible?: boolean;
  h1Count?: number;
  lang?: string;
};

export type AiCrawlerName = "OAI-SearchBot" | "ChatGPT-User" | "PerplexityBot" | "Perplexity-User" | "ClaudeBot" | "Claude-User" | "Googlebot" | "Google-Extended" | "Bingbot" | "GPTBot";

export type CrawlAudit = {
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  sitemapUrl?: string;
  attempted: number;
  pagesCrawled: number;
  pagesBlockedByRobots: number;
  pagesNoindex: number;
  pagesMissingCanonical: number;
  pagesCanonicalMismatch: number;
  pagesWithStructuredData: number;
  pagesWithStructuredDataMismatch?: number;
  pagesMissingTitle: number;
  pagesMissingDescription: number;
  pagesMissingH1: number;
  aiSearchBotAllowed: boolean;
  gptBotAllowed: boolean;
  /** Per-crawler robots result. Optional so older persisted scans remain readable. */
  crawlerAccess?: Partial<Record<AiCrawlerName, boolean>>;
  /** AIのロボットの名前で実際にトップページを開いた結果（Cloudflare などでの遮断を見る）。古い記録には無い */
  firewall?: { cdn: "cloudflare" | null; tested: AiCrawlerName[]; blocked: AiCrawlerName[] };
};

export type AiVisibilityCheck = {
  id: string;
  group: "access" | "clarity" | "proof" | "measurement";
  status: "ready" | "review" | "missing";
  title: string;
  detail: string;
  action: string;
};

export type AiVisibilityAudit = {
  generatedAt: string;
  readiness: "ready" | "needs-review" | "blocked";
  checks: AiVisibilityCheck[];
  priorityCheckId: string;
  crawl: CrawlAudit;
};

export type Competitor = {
  name: string;
  domain?: string;
  reason: string;
  confidence: number;
};

export type CompanyDiscovery = {
  legalName: string;
  brandName: string;
  domain: string;
  summary: string;
  market: string;
  targetCustomers: string[];
  useCases: string[];
  aliases: string[];
  competitors: Competitor[];
  confidence: number;
};

export type BuyerPrompt = {
  id: string;
  text: string;
  cluster: PromptCluster;
  importance: number;
  /** Derived from the question cluster; used to prioritize commercial intent without claiming revenue. */
  intent?: BuyerPromptIntent;
  stage?: BuyerPromptStage;
  /** A relative 1–5 urgency used only for panel ordering and explanation. */
  urgency?: number;
  panel: PromptPanelKind;
  version: number;
};

export type ObservationStatus = "success" | "failed" | "skipped";

export type Observation = {
  id: string;
  promptId: string;
  prompt: string;
  provider: ProviderName;
  model: string;
  repetition: number;
  status: ObservationStatus;
  rawText: string;
  citations: Citation[];
  recommendedEntities: string[];
  ownRecommended: boolean;
  ownPosition: number | null;
  firstCandidate: string | null;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  searchRequests?: number;
  costUsd?: number;
  error?: string;
};

export type CompetitorMetric = {
  name: string;
  recommendedCount: number;
  firstChoiceCount: number;
  coverage: number;
};

export type LostPrompt = {
  promptId: string;
  prompt: string;
  winner: string | null;
  summary: string;
  citations: Citation[];
  observations: Observation[];
};

export type EvidenceGap = {
  id: string;
  label: string;
  whyItMatters: string;
  relatedPromptIds: string[];
  relatedPromptCount: number;
  competitorEvidence?: string;
  confidence: number;
  status: "missing" | "partial";
};

export type ActionCard = {
  id: string;
  title: string;
  rationale: string;
  type: "owned" | "third_party" | "technical" | "positioning" | "entity";
  relatedPromptIds: string[];
  relatedPromptCount: number;
  priority: "critical" | "high" | "medium";
  confidence: number;
  target: string;
  /** Relative prioritization evidence; never presented as an ROI forecast. */
  impactScore?: number;
  effort?: "low" | "medium" | "high";
  /** Optional marketing handoff fields. These describe a testable hypothesis, not a revenue forecast. */
  audience?: string;
  stage?: BuyerPromptStage;
  customerConcern?: string;
  placement?: string;
  cta?: string;
  successMetric?: string;
  evidenceType?: "observed" | "hypothesis";
};

export type ChangePackFact = {
  label: string;
  value: string;
  source: "public" | "company_asserted";
  sourceUrl?: string;
};

export type ChangePackItem = {
  id: string;
  actionId: string;
  title: string;
  target: string;
  objective: string;
  factsUsed: ChangePackFact[];
  proposedTitle: string;
  proposedLead: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
  relatedPromptIds: string[];
  publishChecks: string[];
};

export type AiReadableDraft = {
  generatedAt: string;
  sourceMeasurementId: string;
  sourceUrl: string;
  suggestedFileName: string;
  llmsTxt: string;
  jsonLd: string;
  sourcePages: Array<{ url: string; title: string; description: string }>;
  publishChecks: string[];
};

export type CompetitorWeakness = {
  competitor: string;
  weakness: string;
  rationale: string;
};

export type ActionableMessage = {
  channel: "sns" | "blog" | "flyer" | "profile";
  channelLabel: string;
  headline: string;
  copy: string;
  instruction: string;
};

export type StrategyDeliverable = {
  label: string;
  text: string;
};

export type StrategyCompetitorAnalysis = {
  name: string;
  gap: string;
  differentiation: string;
};

export type StrategyOption = {
  id: string;
  code: string;
  name: string;
  targetMarket: string;
  coreThesis: string;
  /** 公開ページに載せる情報を選ぶときの手がかり（画面には出さない）。古い保存データには無い */
  focusKeyword?: string;
  strategicReason: string;
  competitorAnalysis: StrategyCompetitorAnalysis[];
  isRecommended?: boolean;
  revenueImpact?: string;
  passionateReason?: string;
  deliverables: {
    profile: StrategyDeliverable;
    website: StrategyDeliverable;
    brief: StrategyDeliverable;
  };
};

export type StrategicGroundingFaq = {
  id: string;
  q: string;
  aiObservations: {
    chatgpt: string;
    gemini: string;
    claude: string;
    perplexity: string;
  };
  vulnerabilityAnalysis: string;
  databaseStrategy: string;
  canonicalGroundingAnswer: string;
};

export type PositioningAdvice = {
  winningAngle: string;
  summary: string;
  competitorWeaknesses: CompetitorWeakness[];
  actionableMessages: ActionableMessage[];
  strategies?: StrategyOption[];
  strategicFaqs?: StrategicGroundingFaq[];
};

export type ChangePack = {
  generatedAt: string;
  sourceMeasurementId: string;
  model: string;
  items: ChangePackItem[];
  positioning?: PositioningAdvice;
  changeId?: string;
  measurementPlan?: {
    promptIds: string[];
    successMetric: string;
    nextCheck: string;
  };
  aiReadable?: AiReadableDraft;
};

export type MeasurementPanel = {
  kind: PromptPanelKind;
  version: number;
  promptCount: number;
  repetitions: number;
  locale: "ja-JP";
  country: "JP";
};

/**
 * A comparable change between two measurement runs. This is a prompt-level
 * recovery rate, not a share of customers, revenue, or the whole AI market.
 */
export type TakeBackShareMetric = {
  status: "available" | "not-comparable" | "incomplete";
  value: number | null;
  recoveredPromptCount: number;
  eligiblePromptCount: number;
  baselineLostPromptCount: number;
  note: string;
};

export type ScanResult = {
  scanId: string;
  targetUrl: string;
  discovery: CompanyDiscovery;
  panel: MeasurementPanel;
  prompts?: BuyerPrompt[];
  measuredAt: string;
  observations: Observation[];
  scheduledObservations: number;
  successfulObservations: number;
  measurementCompleteness: number;
  recommendationCoverage: number;
  firstChoiceRate: number;
  mentionCoverage: number;
  citationCoverage: number;
  repeatAgreement: number;
  ownRecommendationCount: number;
  marketPosition: number;
  marketSize: number;
  competitors: CompetitorMetric[];
  lostPrompts: LostPrompt[];
  evidenceGaps: EvidenceGap[];
  actions: ActionCard[];
  visibilityAudit?: AiVisibilityAudit;
  positioning?: PositioningAdvice;
  /** Optional, pure summaries derived from the same public scan inputs. */
  marketMap?: MarketMap;
  demandProxy?: DemandProxy;
  contentQuality?: ContentQuality;
  totalCostUsd: number;
  warnings: string[];
  /** AIキー未設定の開発環境で、AIの答えを模擬データで作った結果（画面に「デモ」と表示する） */
  demo?: boolean;
};

export type ScanRecord = {
  id: string;
  targetUrl: string;
  stage: ScanStage;
  progress: number;
  message: string;
  result: ScanResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Rovan's optional public company record. This is intentionally a small,
 * public-information-only surface. It is not a copy of a ScanResult: prompt
 * answers, provider details, competitors, raw crawl text, billing data, and
 * company-entered evidence stay outside this type.
 */
export type PublicProfileStatus = "draft" | "published" | "revoked" | "expired";

export type PublicProfileFact = {
  provenance?: "company_asserted" | "source_excerpt";
  label: string;
  value: string;
  sourceUrl: string;
};

export type PublicProfileSourcePage = {
  url: string;
  title: string;
  description: string;
};

/** The safe shape returned by the preview, public API, and public web routes. */
export type PublicProfile = {
  id: string;
  slug: string;
  status: PublicProfileStatus;
  title: string;
  brandName: string;
  targetUrl: string;
  summary: string;
  market: string;
  targetCustomers: string[];
  useCases: string[];
  facts: PublicProfileFact[];
  sourcePages: PublicProfileSourcePage[];
  /** JSON-LD generated only from the safe fields above. */
  structuredData: string;
  /** Human- and model-readable Markdown generated only from public facts. */
  markdown: string;
  /** A JSON document of the same safe facts, kept as text for download/copy. */
  json: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  publishedAt?: string;
};

/** The input used to create a preview before storage assigns identity/timing. */
export type PublicProfileDraft = Pick<
  PublicProfile,
  | "title"
  | "brandName"
  | "targetUrl"
  | "summary"
  | "market"
  | "targetCustomers"
  | "useCases"
  | "facts"
  | "sourcePages"
  | "structuredData"
  | "markdown"
  | "json"
>;

/** Internal storage record. `token` and `sourceScanId` never leave storage. */
export type PublicProfileRecord = PublicProfile & {
  token: string;
  sourceScanId: string;
  /** Private grant and recovery snapshot; never serialized to a public page. */
  automation?: {
    enabled: boolean;
    maintenanceEnabled?: boolean;
    watchId: string;
    grantedAt: string;
    lastRunId?: string;
    lastUpdatedAt?: string;
    previousFacts?: PublicProfileFact[];
    previousManagedFacts?: PublicProfileFact[];
    managedFacts?: PublicProfileFact[];
    changedFactCount?: number;
    /** Stored in the existing private automation JSON, never in public DTOs. */
    freeExpiresAt?: string;
    renewedAt?: string;
    renewalExpiresAt?: string;
    measurementScanId?: string;
  };
};

export type EvidenceAnswer = {
  gapId: string;
  value: string;
  sourceUrl?: string;
  status: "company_asserted" | "verified" | "disputed" | "expired";
  updatedAt: string;
};

export type CompetitorEventType = "pricing_added" | "case_study_added" | "feature_updated" | "certification_added" | "speed_claim_added";

export type CompetitorEvent = {
  id: string;
  competitorName: string;
  sourceUrl: string;
  eventType: CompetitorEventType;
  summary: string;
  dimensions: string[];
  extractedFacts: string[];
  affectedPromptIds: string[];
  severity: "high" | "medium" | "low";
  confidence: number;
  detectedAt: string;
};

export type AutoActionType = "profile_fact_updated" | "source_synced" | "gap_addressed";

export type AutoAction = {
  beforeScanId?: string;
  publishedUrl?: string;
  addedFacts?: PublicProfileFact[];
  removedFacts?: PublicProfileFact[];
  id: string;
  triggerEventIds: string[];
  actionType: AutoActionType;
  factLabel: string;
  factValue: string;
  sourceUrl: string;
  affectedPromptIds: string[];
  summary: string;
  /** Planned suggestions are not public changes until explicitly approved. */
  status?: "planned" | "applied";
  plannedAt?: string;
  /** Kept optional for compatibility with older stored records. */
  executedAt?: string;
};

export type ProviderMovement = "improved" | "unchanged" | "declined" | "unavailable";

export type AutoActionImpact = {
  comparedAnswerGroups?: number;
  id: string;
  actionId: string;
  afterScanId: string;
  observedUplift: number;
  affectedPromptCount: number;
  providerAgreement: {
    openai: ProviderMovement;
    gemini: ProviderMovement;
    perplexity: ProviderMovement;
  };
  causalConfidence: "high" | "medium" | "low";
  summary: string;
  measuredAt: string;
};

export type MonthlyValueReport = {
  period: string;
  aiObservationCount: number;
  competitorChangeCount: number;
  citationChangeCount: number;
  profileUpdateCount: number;
  autoActionCount: number;
  observedUpliftSummary: string;
  topRisks: string[];
  upcomingTracking: string[];
};

export type WatchStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";

export type WatchRecord = {
  id: string;
  token: string;
  email: string;
  scanId: string;
  status: WatchStatus;
  paid: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  baseline: ScanResult;
  latest: ScanResult;
  history: ScanResult[];
  evidence: EvidenceAnswer[];
  changePack?: ChangePack | null;
  competitorEvents?: CompetitorEvent[];
  autoActions?: AutoAction[];
  autoActionImpacts?: AutoActionImpact[];
  monthlyReport?: MonthlyValueReport;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WatchMeasurementRunStatus = "pending" | "running" | "completed" | "failed";

export type WatchMeasurementRun = {
  id: string;
  watchId: string;
  watchToken: string;
  status: WatchMeasurementRunStatus;
  targetUrl: string;
  discovery: CompanyDiscovery;
  prompts: BuyerPrompt[];
  panelKind: PromptPanelKind;
  repetitions: number;
  switchToCore: boolean;
  nextPromptIndex: number;
  observations: Observation[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type ScanProgressEvent = {
  stage: ScanStage;
  progress: number;
  message: string;
  detail?: string;
};

/**
 * A comparison map derived only from the public discovery and measurement
 * already present in a ScanResult. It is a directional map, not a market-size
 * or revenue estimate. The first six fields form the result-screen contract;
 * the optional metadata is available to callers that need provenance.
 */
export type MarketMapRelation = "subject" | "direct" | "alternative" | "adjacent";

export type MarketMapNode = {
  id: string;
  name: string;
  relation: MarketMapRelation;
  domain?: string;
  confidence: number;
  evidenceType: "observed" | "inferred";
  evidence: string[];
  sourceUrls: string[];
};

export type MarketMap = {
  direct: string[];
  alternatives: string[];
  adjacent: string[];
  upstream: string[];
  downstream: string[];
  keywords: string[];
  /** Optional provenance for an expanded view; not needed by the compact UI. */
  generatedAt?: string;
  subject?: { name: string; domain: string; market: string };
  nodes?: MarketMapNode[];
  limitations?: string[];
};

/**
 * A prompt-level demand proxy. priorityScore is a relative prioritization
 * signal for this measurement and must not be presented as search volume,
 * probability of purchase, or a revenue forecast.
 */
export type DemandProxySignal = {
  label: string;
  value: string;
  detail: string;
  confidence: "observed" | "inferred";
  /** Optional prompt-level provenance for drill-down. */
  id?: string;
  promptId?: string;
  prompt?: string;
  cluster?: PromptCluster;
  stage?: BuyerPromptStage;
  intent?: BuyerPromptIntent;
  priorityScore?: number;
  importance?: number;
  urgency?: number;
  successfulObservations?: number;
  ownRecommendationRate?: number;
  firstChoiceRate?: number;
  lostPrompt?: boolean;
  nextAction?: string;
};

export type DemandProxyPriorityPrompt = {
  promptId: string;
  label: string;
  score: number;
};

export type DemandProxy = {
  signals: DemandProxySignal[];
  priorityPrompts: DemandProxyPriorityPrompt[];
  generatedAt?: string;
  measuredPromptCount?: number;
  successfulPromptCount?: number;
  lostPromptCount?: number;
  limitations?: string[];
};

export type ContentQualityStatus = "ready" | "review" | "missing";

export type ContentQualityCheck = {
  label: string;
  status: ContentQualityStatus;
  detail: string;
  /** Optional provenance/action fields for a detailed view. */
  id?: string;
  action?: string;
  pageUrls?: string[];
  evidenceType?: "observed" | "heuristic";
  confidence?: number;
};

export type ContentQualityPage = {
  url: string;
  title: string;
  score: number;
  checks: ContentQualityCheck[];
};

export type ContentQuality = {
  pages: ContentQualityPage[];
  summary: { ready: number; review: number; missing: number };
  generatedAt?: string;
  targetUrl?: string;
  limitations?: string[];
};

export type ContentQualityReport = ContentQuality;
