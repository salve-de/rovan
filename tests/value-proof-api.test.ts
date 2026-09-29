import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
test('owner proof endpoint authenticates, reads saved data without provider calls and excludes operational secrets',()=>{
 const child=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','--input-type=module','-e',`
 const load=async p=>{const m=await import(p);return m.default||m;};
 const assert=(await import('node:assert/strict')).default;
 globalThis.fetch=async()=>{throw Error('Unexpected network');};
 const s=await load('./lib/storage.ts');const {sampleWatch}=await load('./lib/sample-data.ts');const {GET}=await load('./app/api/watch/proof/route.ts');
 const fixture=sampleWatch();const scan={id:'proof-api',targetUrl:fixture.baseline.targetUrl,result:fixture.baseline,createdAt:fixture.createdAt};
 const w=await s.createWatch(scan,'');await s.updateWatch(w.token,{latest:fixture.latest,history:fixture.history});
 assert.equal((await GET(new Request('https://local/api/watch/proof'))).status,401);
 assert.equal((await GET(new Request('https://local/api/watch/proof?token=invalid'))).status,404);
 const response=await GET(new Request('https://local/api/watch/proof?token='+w.token));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const proof=await response.json();assert.equal(proof.rows.length,fixture.latest.prompts.length*3);assert.ok(proof.rows.some(r=>r.afterAnswers.some(a=>a.text)));
 const serialized=JSON.stringify(proof);assert.ok(!serialized.includes(w.token));assert.ok(!serialized.includes('stripeCustomerId'));
 const exportResponse=await GET(new Request('https://local/api/watch/proof?token='+w.token+'&format=report'));assert.match(exportResponse.headers.get('content-disposition'),/attachment/);const report=await exportResponse.text();assert.ok(report.includes('AIの答えの報告書'));assert.ok(!report.includes(w.token));
 const demo=await GET(new Request('https://local/api/watch/proof?sample=1&format=csv'));assert.equal(demo.status,200);assert.match(demo.headers.get('content-disposition'),/sample/);
 const wrong=await GET(new Request('https://local/api/watch/proof?sample=1&token=invalid'));assert.equal(wrong.status,404);
 `],{encoding:'utf8',timeout:20000,env:{...process.env,NODE_ENV:'test',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''}});
 assert.equal(child.status,0,child.stderr||String(child.error));
});
