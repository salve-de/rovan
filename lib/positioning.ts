import type { Observation, PositioningAdvice, ScanResult, StrategicGroundingFaq, StrategyOption } from "@/lib/types";

/** Discovery describes hypotheses, not source-verified company capabilities. */
function observedLosses(result: ScanResult) {
  return result.lostPrompts.flatMap((loss) => {
    const observations = result.observations.filter((row) => row.promptId === loss.promptId && row.status === "success");
    return observations.some((row) => !row.ownRecommended)
      ? [{ ...loss, prompt: observations[0].prompt, observations }]
      : [];
  });
}

function candidateRows(observations: Observation[], focus: string) {
  const candidates = [...new Set(observations.filter((row) => !row.ownRecommended).flatMap((row) => row.recommendedEntities))];
  return candidates.slice(0, 3).map((name) => ({
    name,
    gap: `自社が候補外だった取得成功の回答で「${name}」が候補に含まれました`,
    differentiation: `検証仮説：${focus}に応えられる専門性・対応条件が自社の参照元にあるか確認する。他社の対応可否は未確認です。`,
  }));
}

function deriveStrategies(result: ScanResult): StrategyOption[] {
  const brand = result.discovery.brandName || "自社";
  const losses = observedLosses(result);
  const audience = result.discovery.targetCustomers.filter((value) => value.trim());
  const useCases = result.discovery.useCases.filter((value) => value.trim());
  // label は画面（強みのカード）にそのまま出す言葉。keyword は公開ページに載せる情報を選ぶ手がかり。focus・basis は内部の記録用
  const seeds = [
    ...audience.slice(0, 1).map((value) => ({ id: "audience", focus: `「${value}」という顧客層`, basis: "会社解析で得た対象顧客の仮説です。実際に対応しているかは未確認です。", rows: [] as Observation[],
      label: `${value}に選ばれる`, keyword: value })),
    ...useCases.slice(0, 1).map((value) => ({ id: "use-case", focus: `「${value}」という利用場面`, basis: "会社解析で得た用途の仮説です。提供可否や実績は参照元での確認が必要です。", rows: [] as Observation[],
      label: `「${value}」に強い`, keyword: value })),
    ...losses.map((loss) => ({ id: `prompt-${loss.promptId}`, focus: `「${loss.prompt}」という相談`, basis: `測定質問 ${loss.promptId} の取得成功 ${loss.observations.length}件中、自社が候補外の回答がありました。需要量や失注を示すものではありません。`, rows: loss.observations,
      label: `「${loss.prompt}」に答える`, keyword: loss.prompt })),
  ];

  return seeds.slice(0, 3).map((seed, index) => {
    const relatedGap = result.evidenceGaps.find((gap) => seed.rows.some((row) => gap.relatedPromptIds.includes(row.promptId)));
    const check = relatedGap ? `「${relatedGap.label}」の記載と参照元を確認する。` : "対応対象・条件・専門性の記載と参照元を確認する。";
    const draft = `${brand}の推薦獲得に向けた検証用下書き（公開前に事実確認）\n対象仮説：${seed.focus}\n${check}\n対応できるという断定は、参照元で確認できるまで掲載しない。`;
    return {
      id: seed.id,
      code: `強み ${String(index + 1).padStart(2, "0")}`,
      name: seed.label,
      targetMarket: "",
      // 決まり文句の説明文は出さない（カードは強みの名前だけで選べる）
      coreThesis: "",
      focusKeyword: seed.keyword,
      strategicReason: `${seed.basis} 大手との知名度の差だけで競わず、この対象に応えられる事実を探して推薦獲得を目指します。${check}`,
      competitorAnalysis: candidateRows(seed.rows, seed.focus),
      passionateReason: "ニッチを絞る戦略仮説です。会社の対応事実や競合の弱点を断定せず、参照元確認と公開前の承認が必要です。推薦・顧客獲得・売上は保証しません。",
      deliverables: {
        profile: { label: "公開プロフィールの検証用下書き", text: draft },
        website: { label: "相談に答える記事・FAQの構成案", text: `${draft}\n構成案：この相談に対応できる条件／対象外の条件／確認できる参照元。回答内容は未確認です。` },
        brief: { label: "案内文の検証用下書き", text: `${draft}\n案内する問い合わせ先も公開情報で確認してから記載する。` },
      },
    };
  });
}

export function deriveStrategicGroundingFaqs(result: ScanResult): StrategicGroundingFaq[] {
  return observedLosses(result).slice(0, 3).map((loss, index) => {
    const providerLog = (provider: Observation["provider"]) => {
      const rows = loss.observations.filter((row) => row.provider === provider);
      return rows.length ? rows.map((row) => [
        `測定ログ ${row.id} / ${row.model} / ${row.completedAt}`,
        row.rawText || "回答本文は保存されていません。",
        ...row.citations.map((citation) => `参照元：${citation.url}`),
      ].join("\n")).join("\n\n") : "この質問の取得成功ログはありません。";
    };
    return {
      id: `FAQ-${index + 1}`,
      q: loss.prompt,
      aiObservations: { chatgpt: providerLog("openai"), gemini: providerLog("gemini"), perplexity: providerLog("perplexity"), claude: "測定対象外です。回答ログはありません。" },
      vulnerabilityAnalysis: "この質問で自社が候補外の回答を観測しました。原因、他社の弱点、会社の対応可否はこのログだけでは判断できません。",
      databaseStrategy: "この相談に応えられる専門性や条件が自社の公開情報にあるか確認し、参照元のある事実だけを承認後の公開案に使います。",
      canonicalGroundingAnswer: "回答案は未確定です。この相談への対応可否・条件・参照元が確認できるまで、会社の提供事実として記載しません。",
    };
  });
}

/** Evidence-linked niche hypotheses; never invented company or competitor facts. */
export function derivePositioningAdvice(result: ScanResult): PositioningAdvice {
  const strategies = deriveStrategies(result);
  const primary = strategies.find((strategy) => strategy.id.startsWith("prompt-")) || strategies[0];
  const rows = observedLosses(result).flatMap((loss) => loss.observations);
  return {
    winningAngle: primary?.name || "推薦獲得の戦略を絞るための情報が不足しています",
    summary: primary?.strategicReason || "対象顧客・用途の仮説や取得成功の回答ログを確認できません。会社の強みや競合の弱点を推測した戦略は生成していません。",
    competitorWeaknesses: candidateRows(rows, "候補外だった相談").map((item) => ({ competitor: item.name, weakness: item.gap, rationale: item.differentiation })),
    actionableMessages: primary ? [
      { channel: "profile", channelLabel: "公開プロフィール案", headline: "狭い相談条件で選ばれる理由を探す", copy: primary.deliverables.profile.text, instruction: "対象顧客・用途は仮説です。参照元と現在の提供条件を確認してから公開してください。" },
      { channel: "blog", channelLabel: "記事・FAQ構成案", headline: "候補外だった相談への回答を検討する", copy: primary.deliverables.website.text, instruction: "会社の回答として使う前に対応可否と参照元を確認してください。自社サイトへの掲載は任意です。" },
      { channel: "flyer", channelLabel: "案内文の下書き", headline: "選ばれる理由と条件を確認する", copy: primary.deliverables.brief.text, instruction: "未確認の強み・実績・対応条件は記載しないでください。" },
    ] : [],
    strategies,
    strategicFaqs: deriveStrategicGroundingFaqs(result),
  };
}
