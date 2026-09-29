import { isOwnedCitation } from "@/lib/entity-extraction";
import type { ScanResult } from "@/lib/types";

type CitationRow = {
  url: string;
  title: string;
  domain: string;
  references: number;
  prompts: number;
  owned: boolean;
};

function buildRows(result: ScanResult): CitationRow[] {
  const rows = new Map<string, { title: string; domain: string; references: number; promptIds: Set<string> }>();
  for (const observation of result.observations) {
    if (observation.status !== "success") continue;
    for (const citation of observation.citations) {
      const current = rows.get(citation.url) || { title: citation.title, domain: citation.domain, references: 0, promptIds: new Set<string>() };
      current.references += 1;
      current.promptIds.add(observation.promptId);
      if (!current.title && citation.title) current.title = citation.title;
      if (!current.domain && citation.domain) current.domain = citation.domain;
      rows.set(citation.url, current);
    }
  }
  return [...rows.entries()]
    .map(([url, row]) => ({ url, title: row.title || row.domain || url, domain: row.domain, references: row.references, prompts: row.promptIds.size, owned: isOwnedCitation(url, result.discovery.domain) }))
    .sort((a, b) => b.prompts - a.prompts || b.references - a.references || a.url.localeCompare(b.url))
    .slice(0, 8);
}

export function CitationMap({ result }: { result: ScanResult }) {
  const rows = buildRows(result);
  if (!rows.length) return null;

  return <section className="citation-map" aria-label="AIが参考にしたページ">
    <div className="citation-map-heading">
      <h3>AIが参考にしたページ</h3>
    </div>
    <div className="citation-map-table" role="table" aria-label="AIが参考にしたページ">
      <div className="citation-map-row citation-map-head" role="row"><span role="columnheader">ページ</span><span role="columnheader"></span><span role="columnheader">関係する質問</span><span role="columnheader">参考にされた回数</span></div>
      {rows.map((row) => <div className="citation-map-row" role="row" key={row.url}>
        <a href={row.url} target="_blank" rel="noreferrer" role="cell"><strong>{row.title}</strong><small>{row.domain}</small></a>
        <span role="cell" className={row.owned ? "citation-owned" : "citation-third-party"}>{row.owned ? "御社" : ""}</span>
        <strong role="cell">{row.prompts}問</strong>
        <span role="cell">{row.references}回</span>
      </div>)}
    </div>
  </section>;
}
