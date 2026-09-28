"use client";

import { Badge } from "@/components/ui";

const REASONS = [
  {
    num: "01",
    title: "既存の公開情報から、選ばれる理由を自動抽出",
    body: "URLまたは社名を起点に、専門分野・対応地域・利用条件など、御社がどんな相談に応えられるかを公開情報から自動整理。参照元にない架空の実績を追加することはありません。",
  },
  {
    num: "02",
    title: "自社サイトの改修は1文字も不要。AI専用ページを開設",
    body: (
      <>
        既存の自社サイトは1文字も触る必要がありません。<br />
        AIが読み取れる確定仕様ページをRovan上に用意し、内容を確認して公開に同意すればすぐ公開できます。
      </>
    ),
  },
  {
    num: "03",
    title: "毎週のAI回答追跡と、掲載データの自動調整",
    body: "毎週同じ条件でAI回答の変化を自動追跡し、AIの回答傾向や自社情報の変化に合わせてRovan上の掲載データを調整します。社長が毎週チェックや承認をする手間は一切ありません。",
  },
];

export function ZeroEffortPromiseSection() {
  return (
    <section id="zero-effort-promise" className="zero-effort-promise-section shell" aria-label="手間を抑えてAI推薦の獲得を目指す仕組み">
      <div className="promise-panel">
        <div className="promise-panel-head">
          <Badge>社長の作業は、入力と初回の公開同意だけ</Badge>
          <h2>
            URLまたは社名の入力と、初回の公開同意だけ。<br />
            情報の整備と毎週の追跡を、すべてRovanに任せて本業へ。
          </h2>
          <p>
            ホームページの改修も、サーバーの設定も、面倒なブログ更新も一切不要です。<br />
            <strong>専門知識や面倒なアンケート回答は不要。</strong> 公開情報からAI推薦データを自動構築し、初回の公開同意だけで配備完了。以降の毎週の承認は不要です。
          </p>
        </div>

        <div className="promise-grid">
          {REASONS.map((reason) => (
            <div key={reason.num} className="promise-card">
              <div className="promise-card-head">
                <span className="promise-card-num">{reason.num}</span>
                <strong>{reason.title}</strong>
              </div>
              <p>{reason.body}</p>
            </div>
          ))}
        </div>

        <div className="promise-commit-bar">
          <div className="promise-commit-main">
            <Badge tone="success">安心の約束</Badge>
            <span className="promise-commit-text">
              <strong>社長は、本業（接客・施工・製造・経営）に100%専念してください。</strong><br />
              会社紹介文や自社サイトは書き換えません。無料公開は30日間。有料プランでは、掲載維持に同意した公開ページの有効期限を週次測定時に更新します。非公開にしたページや期限切れのページを勝手に再公開しません。
            </span>
          </div>
          <Badge>入力: URLまたは社名</Badge>
        </div>
      </div>
    </section>
  );
}
