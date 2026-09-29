/** 画面に出す項目名。以前の保存データに残る内部向けの項目名を、ふつうの言葉にする */
const LEGACY_FACT_LABELS: Record<string, string> = {
  "入力された名称": "名称",
  "入力された分野": "分野",
  "入力された参照先（未確認）": "ホームページ",
  "電話番号・窓口": "電話番号",
  "営業時間・受付体制": "営業時間",
  "料金規約・費用目安": "料金の目安",
  "参照元の記載": "ホームページより",
};

export function displayFactLabel(label: string) {
  return LEGACY_FACT_LABELS[label] || label;
}

/** 画面に出す紹介文。以前の保存データの「入力情報（参照元未確認）：」と、決まり文句だけの紹介文は出さない */
export function displaySummary(summary: string) {
  const text = summary.replace(/^入力情報（参照元未確認）：/u, "").trim();
  return /について入力された情報を、公開前に確認できる形で整理した参照ページです。$/u.test(text) ? "" : text;
}
