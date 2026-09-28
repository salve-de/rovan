import { CtaBand } from "@/components/page/cta-band";

// 最後のひと押し。勝ち：ここまで読んだ人が迷わず診断する。
export function HomeFinalCta() {
  return (
    <section className="home-final-cta">
      <div className="shell">
        <CtaBand title="御社の名前が出ているか、いますぐ無料で確かめる" />
      </div>
    </section>
  );
}
