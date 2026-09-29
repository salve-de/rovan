import { getSampleProfile } from "./sample-profiles";
import type { AiReadableDraft, ChangePack, ScanResult } from "./types";

/** Only explicitly selected demo routes use these fictional, source-aligned examples. */
export function sampleAiReadable(): AiReadableDraft {
  const profile = getSampleProfile("aoba-souzoku")!;
  return {
    generatedAt: profile.updatedAt,
    sourceMeasurementId: "sample_clean_room",
    sourceUrl: profile.targetUrl,
    suggestedFileName: "aoba-souzoku-ai-public-info",
    llmsTxt: profile.markdown,
    jsonLd: profile.structuredData,
    sourcePages: profile.sourcePages,
    publishChecks: [
      "初回60分無料・予約制という条件と参照元を照合する",
      "税込88,000円からの基本料金と、別途必要な実費を分けて掲載する",
      "平日20時まで・土曜予約の受付条件を確認する",
      "2〜4週間は資料が揃った後の書類整理の目安であり、手続き完了の保証ではないと明記する",
      "会社名・対象・公開先を確認してから公開する",
    ],
  };
}

export function sampleChangePack(result: ScanResult): ChangePack {
  const profile = getSampleProfile("aoba-souzoku")!;
  const draft = sampleAiReadable();
  return {
    generatedAt: result.measuredAt,
    sourceMeasurementId: result.scanId,
    model: "fictional-example",
    changeId: "sample-consultation-conditions",
    aiReadable: { ...draft, generatedAt: result.measuredAt, sourceMeasurementId: result.scanId },
    measurementPlan: {
      promptIds: ["prompt_6", "prompt_7", "prompt_11", "prompt_12"],
      successMetric: "遠方・費用・受付時間の4問で候補入りを再確認し、取得できた回答数とともに比較する",
      nextCheck: "2026-09-15T09:00:00.000Z",
    },
    items: [{
      id: "sample-consultation", actionId: "action-scope",
      title: "遠方の家族と、仕事帰りに相談できる条件をまとめる",
      target: "Rovan公開ページの相談案内",
      objective: "オンライン同席・予約時間・費用を、別々のページを探さず比較できるようにする",
      factsUsed: profile.facts.filter(fact => ["初回相談", "料金例", "相談時間", "期間例"].includes(fact.label)).map(fact => ({
        label: fact.label, value: fact.value, source: "public" as const, sourceUrl: fact.sourceUrl,
      })),
      proposedTitle: "遠方の家族とも、仕事帰りにも。初回60分の相続相談",
      proposedLead: "あおば相続法務事務所は、初回60分無料の予約相談に対応。平日は20時までオンラインで相談でき、土曜の予約も受け付けます。",
      sections: [
        { heading: "相続登記は税込88,000円から", body: "基本料金と、登録免許税・証明書取得費などの実費を分けてご案内します。対象不動産・必要資料を確認して個別に見積もります。" },
        { heading: "家族が遠方でもオンラインで同席", body: "初回相談は60分、1日3組までの予約制です。平日20時までのオンライン相談、土曜の予約相談から選べます。" },
        { heading: "資料が揃ってから2〜4週間で書類を整理", body: "遺産分割に必要な資料の整理期間の例です。資料不足や関係者の確認状況で変動し、合意成立や登記完了の期限を保証するものではありません。" },
      ],
      faq: [
        { question: "初回相談に費用はかかりますか？", answer: "この掲載例では初回60分無料です。継続依頼の費用は作業範囲を確認して別途見積もります。" },
        { question: "88,000円だけで手続きが完了しますか？", answer: "基本料金の開始額です。登録免許税・証明書取得費等の実費や、個別条件による追加費用は別途必要です。" },
        { question: "家族が別の地域に住んでいても相談できますか？", answer: "この掲載例ではオンライン同席に対応します。平日20時まで、土曜は予約制です。" },
      ],
      relatedPromptIds: ["prompt_6", "prompt_7", "prompt_11", "prompt_12"],
      publishChecks: draft.publishChecks,
    }],
  };
}

export function enrichSamplePositioning(result: ScanResult) {
  const positioning = result.positioning;
  if (!positioning?.strategies) return positioning;
  const angles = [
    { name: "遠方の家族・仕事帰りの相続相談", target: "日中の来所が難しい人と、離れて暮らす相続人", lead: "平日20時までオンライン相談。遠方の家族も同席でき、土曜予約にも対応します。", promptIds: ["prompt_6", "prompt_11", "prompt_12"] },
    { name: "初回60分無料・費用を先に確認", target: "初めての相続で、依頼費用が不安な人", lead: "初回60分無料。相続登記の基本料金は税込88,000円からで、実費と追加条件を分けて見積もります。", promptIds: ["prompt_1", "prompt_5", "prompt_7"] },
    { name: "必要書類の整理から相談できる", target: "何から準備すればよいか分からない家族", lead: "必要資料を初回に確認し、資料が揃ってから2〜4週間を目安に書類を整理。手続きの完了期限とは分けてご案内します。", promptIds: ["prompt_2", "prompt_4", "prompt_10"] },
  ];
  return {
    ...positioning,
    winningAngle: "来所の難しさ・費用の不安・書類準備という具体的な相談条件で選ばれる",
    summary: "この見本では、初回60分無料・夜間オンライン・書類整理の条件を、参照元付きの公開情報へまとめます。知名度だけで比較される場面から、相談条件に合う候補として選ばれることを目指す構成です。",
    strategies: positioning.strategies.map((strategy, index) => {
      const angle = angles[index % angles.length];
      const rows = result.observations.filter(row => angle.promptIds.includes(row.promptId) && row.status === "success");
      const own = rows.filter(row => row.ownRecommended).length;
      return {
        ...strategy, code: `強み ${String(index + 1).padStart(2, "0")}`, name: angle.name,
        targetMarket: angle.target, coreThesis: angle.lead, focusKeyword: `${angle.name} ${angle.target}`,
        strategicReason: `関連する3問・${rows.length}回答で自社の候補入りは${own}件。この条件を探す人が比較できるよう、受付時間・費用・作業範囲を参照元付きで整理する例です。`,
        passionateReason: "自社サイトの改修は不要。Rovan上の掲載内容を初回に確認し、同じ条件の質問で変化を追跡する想定です。戦略の見本であり、推薦の保証ではありません。",
        deliverables: {
          profile: { label: "公開プロフィールの完成例", text: `あおば相続法務事務所\n${angle.lead}\n相談は予約制・1日3組まで。対応地域は仙台市・名取市で、遠方の家族もオンライン同席が可能です。` },
          website: { label: "FAQの完成例（自社サイトへの掲載は任意）", text: `Q. ${angle.target}でも相談できますか？\nA. ${angle.lead}\n初回は60分無料。個別の依頼範囲と費用は相談時に確認します。` },
          brief: { label: "紹介文の完成例", text: `${angle.name}なら、あおば相続法務事務所。${angle.lead}` },
        },
      };
    }),
  };
}
