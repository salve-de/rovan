/** Q&Aカードの一覧（ホームのよくある質問と同じ見た目） */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="home-faq-grid">
      {items.map((item) => (
        <div className="home-faq-card" key={item.q}>
          <span className="home-faq-q"><b>Q</b>{item.q}</span>
          <p className="home-faq-a">{item.a}</p>
        </div>
      ))}
    </div>
  );
}
