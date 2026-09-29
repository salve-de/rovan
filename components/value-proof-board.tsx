'use client';
import { useEffect, useState } from 'react';
import { proofProviders, providerLabel, type ValueProof } from '@/lib/value-proof';
import { sampleValueProof } from '@/lib/sample-value-proof';
import styles from './value-proof-board.module.css';
const date = (v:string) => new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tokyo'}).format(new Date(v));
const stateLabels: Record<string,string> = { won:'名前が出るように',lost:'名前が出なくなった',unchanged:'変化なし',unavailable:'比べられない',baseline:'初回' };
const vote = (v:boolean|null) => v===null?'取得できず':v?'名前あり':'名前なし';
const stageLabels: Record<string,string> = { measured:'更新のあと測定済み', waiting:'次の測定待ち' };
/** AIの答えの記録：質問ごとの前後・まだ名前が出ない質問・AIが参考にしたページ・公開ページの更新・推移 */
export function ValueProofBoard({sample,token,revision}:{sample:boolean;token:string;revision:string}) {
  const [proof,setProof]=useState<ValueProof|null>(()=>sample?sampleValueProof():null);
  const [error,setError]=useState(''); const [attempt,setAttempt]=useState(0);
  const [visibleCount,setVisibleCount]=useState(12); const [sourceFilter,setSourceFilter]=useState('');
  const [tab,setTab]=useState('answers'); const [provider,setProvider]=useState('all'); const [state,setState]=useState('all'); const [query,setQuery]=useState('');
  useEffect(()=>{
    if(sample) return;
    const controller=new AbortController();
    fetch(`/api/watch/proof?token=${encodeURIComponent(token)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'記録を読み込めませんでした。');
      if(!controller.signal.aborted){setProof(data);setError('');}
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'記録を読み込めませんでした。');});
    return ()=>controller.abort();
  },[sample,token,revision,attempt]);
  if(!proof) return <section className={`shell ${styles.board}`} aria-label="AIの答えの記録"><h2>AIの答えの記録</h2>{error?<p role="alert">{error} <button onClick={()=>setAttempt(v=>v+1)}>もう一度読み込む</button></p>:<p role="status">読み込んでいます。</p>}</section>;
  const rows=proof.rows.filter(r=>(provider==='all'||r.provider===provider)&&(state==='all'||r.state===state)&&r.prompt.toLowerCase().includes(query.toLowerCase())&&(!sourceFilter||r.afterAnswers.some(a=>a.sources.some(s=>s.url===sourceFilter))));
  const comparable=proof.rows.filter(r=>r.comparable).length;
  // 上の「今週の結論」は質問ごと、ここはAIごとの答えを数える（混同しないよう単位を「件」にする）
  const answersIn=(s:string)=>proof.rows.filter(r=>r.state===s).length;
  const tabs=[['answers','質問ごと'],['opportunities','まだ名前が出ない質問'],['sources','AIが参考にしたページ'],['changes','公開ページの更新'],['history','推移']];
  const answerColumn=(answers:ValueProof['rows'][number]['afterAnswers'],heading:string)=><div><h3 className={styles.colHead}>{heading}</h3>{answers.length?answers.map((a,index)=><details open={index===0} key={a.id} className={styles.answer}><summary>{a.status==='success'?vote(a.included):'取得できず'} · {a.repetition}回目{a.completedAt?` · ${date(a.completedAt)}`:''}</summary><p><strong>すすめられた会社：</strong>{a.candidates.join(' / ')||'なし'}</p><pre>{a.text||'（本文なし）'}</pre>{a.truncated?<p>（長いため、はじめの部分だけ表示）</p>:null}<ul>{a.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title||s.url}</a>{s.kind==='answer'?<small> 答えで引用</small>:s.kind==='search'?<small> 検索で取得</small>:null}</li>)}</ul></details>):<p>答えがありません。</p>}</div>;
  const proofQuery = sample?'sample=1':`token=${encodeURIComponent(token)}`;
  return <section id="value-proof" className={`shell ${styles.board}`} aria-label="AIの答えの記録">
    <header className={styles.header}><div><h2>AIの答えの記録</h2><p className={styles.caption}>初回 {date(proof.baselineAt)} → 今回 {date(proof.measuredAt)}</p></div><div className={styles.exports}><a href={`/api/watch/proof?${proofQuery}&format=csv`} download>表で保存（CSV）</a><a href={`/api/watch/proof?${proofQuery}&format=report`} download>報告書を保存</a></div></header>
    {error?<p role="alert">最新の記録を読み込めませんでした。<button onClick={()=>setAttempt(v=>v+1)}>もう一度読み込む</button></p>:null}
    <div className={styles.summary}><div><span>名前が出るようになった答え</span><strong>{comparable?`${answersIn('won')}件`:'—'}</strong></div><div><span>名前が出なくなった答え</span><strong>{comparable?`${answersIn('lost')}件`:'—'}</strong></div><div><span>公開ページの更新</span><strong>{proof.changes.length}回</strong></div><div><span>AIが公開ページを参考にした</span><strong>{proof.publishedCitations.length?'あり':'まだなし'}</strong></div></div>
    <nav className={styles.tabs} aria-label="表示の切りかえ">{tabs.map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {tab==='answers'?<div>
      <div className={styles.filters}><label>質問を検索<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="例: 雨漏り" /></label><label>AI<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="all">すべてのAI</option>{proofProviders.map(p=><option key={p} value={p}>{providerLabel[p]}</option>)}</select></label><label>変化<select value={state} onChange={e=>setState(e.target.value)}><option value="all">すべて</option>{Object.entries(stateLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
      <p role="status">{Math.min(rows.length,visibleCount)} / {rows.length}件</p>
      {sourceFilter?<p>{sourceFilter} を参考にした答えだけ表示しています。 <button onClick={()=>setSourceFilter('')}>もとに戻す</button></p>:null}
      {rows.length?rows.slice(0,visibleCount).map(r=><details key={r.id} className={styles.row}><summary><span className={styles.provider}>{providerLabel[r.provider]}</span><strong>{r.prompt}</strong><span className={styles[r.state]||styles.neutral}>{stateLabels[r.state]}</span><span>{vote(r.before)} → {vote(r.after)}</span></summary><div className={styles.comparison}>{answerColumn(r.beforeAnswers,'初回の答え')}{answerColumn(r.afterAnswers,'今回の答え')}</div>{!r.comparable&&r.state!=='baseline'?<p className={styles.caption}>条件がちがうため、くらべていません。</p>:null}</details>):<p className={styles.empty}>当てはまる質問はありません。</p>}{rows.length>visibleCount?<button onClick={()=>setVisibleCount(n=>n+12)}>さらに{Math.min(12,rows.length-visibleCount)}件を見る（全{rows.length}件）</button>:null}
    </div>:null}
    {tab==='opportunities'?<div><h3>まだ名前が出ない質問</h3>{proof.opportunities.length?proof.opportunities.map(o=><article key={o.promptId} className={styles.change}><h4>{o.prompt}</h4><p>名前が出なかったAI：{o.excludedProviders.map(p=>providerLabel[p]).join(' / ')}</p>{o.facts.length?<><strong>公開ページにある、関係する情報</strong>{o.facts.map((f,i)=><p key={i}>{f.value} {f.sourceUrl?<a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">出典 ↗</a>:null}</p>)}</>:<p>{proof.profilePath?'公開ページに、この質問に関係する情報はまだありません。':'公開ページがまだありません。'}</p>}<button onClick={()=>{setQuery(o.prompt);setState('all');setProvider('all');setSourceFilter('');setTab('answers');}}>AIの答えを見る</button></article>):<p className={styles.empty}>名前が出なかった質問はありません。</p>}</div>:null}
    {tab==='sources'?<div><h3>AIが参考にしたページ</h3>{proof.sources.length?proof.sources.map(s=><article key={s.url} className={styles.source}><div><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a><p>{s.owned?'御社のサイト':'ほかのサイト'} · {s.providers.map(p=>providerLabel[p]).join(' / ')}</p></div><strong>答えで引用 {s.answerCount}件<small>{s.promptIds.length}問に関係</small></strong><button onClick={()=>{setQuery('');setSourceFilter(s.url);setState('all');setProvider('all');setTab('answers');}}>関係する答えを見る</button></article>):<p className={styles.empty}>まだありません。</p>}</div>:null}
    {tab==='changes'?<div><h3>公開ページの更新</h3><div className={styles.next}>{proof.profilePath?<a href={proof.profilePath} target="_blank" rel="noopener noreferrer">公開ページを開く ↗</a>:<strong>公開ページがまだありません。</strong>}<p>自動更新：{proof.automationEnabled?'オン':'オフ'}</p></div>{proof.changes.length?proof.changes.map(c=><article className={styles.change} key={c.id}><p>{date(c.executedAt)}{stageLabels[c.stage]?` · ${stageLabels[c.stage]}`:''}</p><h4>{c.summary}</h4>{c.addedFacts.map((f,i)=><p key={`a${i}`} className={styles.won}>追加：{f.value} {f.sourceUrl?<a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">出典 ↗</a>:null}</p>)}{c.removedFacts.map((f,i)=><p key={`r${i}`} className={styles.lost}>更新前：{f.value}</p>)}{c.comparisons.length?<p>関係する質問で名前が出た答え：{c.comparisons.filter(r=>r.before).length}件 → {c.comparisons.filter(r=>r.after).length}件</p>:null}</article>):<p className={styles.empty}>まだ更新はありません。</p>}</div>:null}
    {tab==='history'?<div><h3>推移</h3><div className={styles.history}>{proof.trend.map((point,i)=><article key={`${point.measuredAt}-${i}`}><h4>{date(point.measuredAt)}</h4>{point.providers.map(p=><div key={p.provider}><span>{providerLabel[p.provider]}</span><meter min={0} max={p.successful||1} value={p.included} aria-label={`${providerLabel[p.provider]} 名前が出た質問 ${p.included} / ${p.successful}`} /><strong>{p.included} / {p.successful}問</strong><small>{p.scheduled>p.successful?`${p.scheduled-p.successful}問は取得できず`:''}</small></div>)}</article>)}</div></div>:null}
  </section>;
}
