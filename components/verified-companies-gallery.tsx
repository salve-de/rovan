import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

type CompanyCase = {
  name: string;
  category: string;
  location: string;
  industry: string;
  featureNote: string;
  beforeProblem: string;
  afterSolution: string;
  registeredSpecs: string;
  href: string;
};

const INDUSTRY_SHOWCASES: CompanyCase[] = [
  {
    name: "山田板金製作所（見本）",
    category: "町工場・中小製造",
    location: "東京都大田区",
    industry: "試作板金加工・精密機械",
    featureNote: "AI推薦データ配備の見本",
    beforeProblem: "小ロット対応の実績が埋もれており、AIが「大手試作センター」ばかり推薦してしまう。",
    afterSolution: "「単品1個対応・短納期試作」を確定データとして配備。急ぎの試作相談でAIの推薦候補へ浮上。",
    registeredSpecs: "単品1個対応 / 3D CAD直接入稿 / 最短即日試作",
    href: "/ai/company/yamada-bankin?sample=1",
  },
  {
    name: "青葉カフェ（見本）",
    category: "飲食・カフェ店舗",
    location: "東京都渋谷区",
    industry: "自家焙煎・スペシャリティ珈琲",
    featureNote: "AI推薦データ配備の見本",
    beforeProblem: "電源や作業利用の設備情報が埋もれ、AIに「近くの作業カフェ」として認識されない。",
    afterSolution: "全席電源・高速Wi-Fiの確定データを配備。作業カフェを探すAI相談で候補に選ばれやすい状態を目指す。",
    registeredSpecs: "全席電源・高速Wi-Fi / 自家焙煎豆 / 作業利用歓迎",
    href: "/ai/company/aoba-cafe?sample=1",
  },
  {
    name: "あおば相続法務事務所（見本）",
    category: "士業・コンサルティング",
    location: "東京都千代田区",
    industry: "相続・遺産分割・事業承継",
    featureNote: "AI回答測定の見本",
    beforeProblem: "初回無料や親身な対応の強みが伝わらず、AIが事務的な大手相談社へ顧客を送客してしまう。",
    afterSolution: "「初回対面相談無料・専任担当一貫対応」を構造化。親身な相談先を求める見込み客へAIが推薦。",
    registeredSpecs: "初回対面相談無料 / 専任担当一貫対応 / 事前面談見積",
    href: "/ai/company/aoba-souzoku?sample=1",
  },
  {
    name: "安曇野サンシャイン果樹園（見本）",
    category: "農業・産直直売",
    location: "長野県安曇野市",
    industry: "特選果樹・産直ぶどう農家",
    featureNote: "AI推薦データ配備の見本",
    beforeProblem: "糖度基準や産地直送のこだわりが伝わっておらず、AIに「百貨店のギフト通販」へ客を奪われる。",
    afterSolution: "「産地直送・当日発送・贈答用ギフト」の品質基準を配備。こだわりの贈り物を求める顧客へ推薦。",
    registeredSpecs: "産地直送・当日発送 / 糖度18度選別 / 贈答用ギフト",
    href: "/ai/company/azumino-sunshine?sample=1",
  },
];

export function VerifiedCompaniesGallery() {
  return (
    <section className="verified-gallery-section" aria-label="業種別の公開情報整理シミュレーション">
      <div className="shell">
        <div className="section-head-center">
          <span className="pill-badge">業種別の実装シミュレーション</span>
          <h2>町工場も、士業も、カフェも、農園も。<br />あらゆる業種で「選ばれるAI推薦データ」を整理・配備。</h2>
          <p>サンプルデータを使った表示例です。各業種の強み・実績・対応条件をAIが読み取れる確定仕様へ整理し、推薦候補入りを目指します。</p>
        </div>

        <div className="verified-cards-grid">
          {INDUSTRY_SHOWCASES.map((company) => (
            <article className="verified-company-card" key={company.name} style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-top-meta" style={{ marginBottom: "10px" }}>
                <span className="card-status-pill">{company.category}</span>
                <span className="card-location">{company.location}</span>
              </div>
              <h3 className="card-company-name" style={{ fontSize: "1.08rem", marginBottom: "2px" }}>{company.name}</h3>
              <p className="card-industry" style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 10px 0" }}>{company.industry}</p>
              
              <div className="card-badge-pill" style={{ marginBottom: "14px", fontSize: "0.68rem" }}>{company.featureNote}</div>

              {/* 洗練された比較ブロック（端正なタイポグラフィで対比） */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "12px 14px",
                  margin: "0 0 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "#64748b",
                      fontFamily: "var(--font-mono, monospace)",
                      display: "block",
                      marginBottom: "4px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    情報が散在している場合
                  </span>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#475569", lineHeight: 1.55 }}>
                    {company.beforeProblem}
                  </p>
                </div>
                <div style={{ paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      fontFamily: "var(--font-mono, monospace)",
                      display: "block",
                      marginBottom: "4px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    公開情報を整理した場合
                  </span>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#0f172a", fontWeight: 600, lineHeight: 1.55 }}>
                    {company.afterSolution}
                  </p>
                </div>
              </div>

              <div className="card-spec-box" style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "6px", margin: "0 0 14px", border: "1px solid #e2e8f0" }}>
                <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b", fontFamily: "var(--font-mono, monospace)", marginBottom: "3px" }}>登録データ（強みの抜粋）</span>
                <strong style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600, display: "block", lineHeight: 1.4 }}>{company.registeredSpecs}</strong>
              </div>

              <Link className="card-view-btn" href={company.href} style={{ marginTop: "auto" }}>
                <span>公開情報の見本を見る</span>
                <ArrowIcon />
              </Link>
            </article>
          ))}
        </div>

        <div className="gallery-footer-note">
          <p>
            ※上記は主要業種における画面確認用の見本です。実在企業の掲載情報や、AIの推薦結果を示すものではありません。
          </p>
        </div>
      </div>
    </section>
  );
}
