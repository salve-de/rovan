import { getWatch, getPublishedProfileForScan } from '@/lib/storage';
import { buildValueProof, evidenceUrl, isPublishedCitation, proofCsv } from '@/lib/value-proof';
import { valueReport } from '@/lib/value-report';
import { sampleValueProof } from '@/lib/sample-value-proof';
import { siteUrl } from '@/lib/site';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
/** Private owner evidence, separate from the public scan and public profile DTOs. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get('token');
  const sample = params.get('sample') === '1' && !token;
  const format = params.get('format');
  const respond = (proof: ReturnType<typeof buildValueProof>) => format === 'report' || format === 'csv'
    ? new Response(format === 'report' ? valueReport(proof,sample) : proofCsv(proof), {headers:{...headers,'content-type':format === 'report' ? 'text/html; charset=utf-8' : 'text/csv; charset=utf-8','content-disposition':`attachment; filename="rovan-${sample?'sample-':''}report.${format === 'report'?'html':'csv'}"`}})
    : Response.json(proof,{headers});
  if(sample) return respond(sampleValueProof());
  if (!token) return Response.json({error:'管理用リンクから開いてください。'}, {status:401,headers});
  try {
    const watch = await getWatch(token);
    if (!watch) return Response.json({error:'見守りが見つかりません。'}, {status:404,headers});
    const profile = await getPublishedProfileForScan(watch.scanId);
    const proof = buildValueProof(watch, profile);
    const url = proof.profilePath ? evidenceUrl(new URL(proof.profilePath,siteUrl).href) : null;
    proof.publishedCitations = url ? [...new Set(watch.latest.observations.filter(o=>o.status==='success').flatMap(o=>o.citations.filter(c=>isPublishedCitation(c,url)).map(c=>evidenceUrl(c.url)!)))] : [];
    return respond(proof);
  } catch { return Response.json({error:'根拠を読み込めませんでした。時間をおいて再試行してください。'}, {status:503,headers}); }
}
