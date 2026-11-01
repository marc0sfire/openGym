// Real PostgreSQL + HTTP contract, opt-in against the explicitly disposable validation DB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
const url = process.env.TEST_DATABASE_URL;
test('cloud: authentication, owner isolation, consent, CAS and persistence across processes', { skip: !url, timeout: 90000 }, async t => {
  assert.match(new URL(url).pathname, /_validation$/,'only the disposable validation database is permitted');
  const pool = new pg.Pool({connectionString:url}); t.after(()=>pool.end());
  await pool.query('CREATE TABLE IF NOT EXISTS opengym_documents(name text PRIMARY KEY, content bytea NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  await pool.query('TRUNCATE opengym_documents');
  const codes = {Marcos:randomBytes(16).toString('hex').toUpperCase(), Marih:randomBytes(16).toString('hex').toUpperCase()};
  const db = {users:[],creds:[],subs:[],invites:Object.entries(codes).map(([personalName,code])=>({personalName,code}))};
  await pool.query('INSERT INTO opengym_documents(name,content) VALUES($1,$2)',['db.json',Buffer.from(JSON.stringify(db))]);
  let child, base;
  async function launch() {
    child = spawn(process.execPath,['--input-type=module','-e',`import http from 'node:http'; import handler from './index.js'; const s=http.createServer(handler); s.listen(0,()=>console.log('PORT='+s.address().port));`],{cwd:new URL('../',import.meta.url),env:{...process.env,DATABASE_URL:url,ORIGIN:'http://localhost:8080',RP_ID:'localhost'},stdio:['ignore','pipe','pipe']});
    child.stderr.on('data',b=>{ if(b.toString().includes('cloud request failed')) process.stderr.write(b) });
    base = await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const m=/PORT=(\d+)/.exec(b.toString());if(m)resolve('http://localhost:'+m[1])});child.on('exit',()=>reject(new Error('test server exited')))});
  }
  t.after(()=>child?.kill()); await launch();
  const req = async (path,{method='GET',cookie,body}={})=>{
    const r=await fetch(base+path,{method,headers:{Origin:'http://localhost:8080',...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  assert.equal((await req('/api/data')).status,401);
  const password=randomBytes(24).toString('base64url');
  const wrong=await req('/api/register/password',{method:'POST',body:{name:'Marih',code:codes.Marcos,password}});
  assert.equal(wrong.status,403);
  const a=await req('/api/register/password',{method:'POST',body:{name:'Marcos',code:codes.Marcos,password}});
  const b=await req('/api/register/password',{method:'POST',body:{name:'Marih',code:codes.Marih,password}});
  assert.equal(a.status,200);assert.equal(b.status,200);assert.notEqual(a.body.user.id,b.body.user.id);
  assert.equal((await req('/api/data',{method:'PUT',cookie:a.cookie,body:{state:{bodyweight:[{d:'2026-11-01',w:81}]},baseRev:0}})).status,403);
  const state = {lang:'pt-BR',unit:'kg',personalConsent:{owner:a.body.user.id,agreedAt:Date.now(),version:1},workouts:[{id:'validation-workout',d:'2026-11-01',name:'Treino de validação',entries:[{id:'1197',sets:[{r:8,w:0,done:true}]}]}],bodyweight:[{d:'2026-11-01',w:81.2}],routines:[]};
  const saved=await req('/api/data',{method:'PUT',cookie:a.cookie,body:{state,baseRev:0}});
  assert.equal(saved.status,200);assert.ok(saved.body.rev>0);
  const own=await req('/api/data',{cookie:a.cookie});assert.equal(own.body.state.workouts[0].id,'validation-workout');
  const other=await req('/api/data?uid='+a.body.user.id,{cookie:b.cookie});assert.equal(other.status,200);assert.equal(other.body.state,null);
  assert.equal((await req('/api/data',{method:'PUT',cookie:b.cookie,body:{state,baseRev:0}})).status,403);
  assert.equal((await req('/api/data',{method:'PUT',cookie:a.cookie,body:{state,baseRev:0}})).status,409);
  const cid=(await req('/api/login/options',{method:'POST',body:{}})).body.cid;
  assert.ok(cid);
  const pairing=await req('/api/pair/create',{method:'POST',cookie:a.cookie,body:{current:password}});assert.equal(pairing.status,200);
  child.kill(); await new Promise(resolve=>child.once('exit',resolve)); await launch();
  const paired=await req('/api/pair/redeem',{method:'POST',body:{code:pairing.body.code}});assert.equal(paired.status,200);assert.equal(paired.body.user.id,a.body.user.id);
  assert.equal((await req('/api/pair/redeem',{method:'POST',body:{code:pairing.body.code}})).status,400);
  const login=await req('/api/login/password',{method:'POST',body:{name:'Marcos',password}});assert.equal(login.status,200);
  const restored=await req('/api/data',{cookie:login.cookie});assert.equal(restored.body.state.bodyweight[0].w,81.2);assert.equal(restored.body.state.workouts.length,1);
  const runtime=JSON.parse((await pool.query("SELECT content FROM opengym_documents WHERE name='_runtime.json'")).rows[0].content);
  assert.ok(runtime.challenges.some(([id])=>id===cid),'passkey challenges survive process replacement');
});
