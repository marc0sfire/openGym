// Household adapter: preserve the existing auth/sync API and serialize its small
// document transactions across ALL Vercel instances. Reply only after COMMIT.
import pg from 'pg';
import { documents } from './storage-fs.js';
const { Pool } = pg;
let pool, app;
let queue = Promise.resolve();
export const schema = `CREATE TABLE IF NOT EXISTS opengym_documents (
  name text PRIMARY KEY, content bytea NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
)`;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  return pool ||= new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 15000 });
}
export async function transaction(fn) {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(187624, 2)');
    await client.query(schema);
    const rows = (await client.query('SELECT name, content FROM opengym_documents')).rows;
    documents.clear(); for (const r of rows) documents.set(r.name, r.content);
    const before = new Map(documents);
    const out = await fn(client);
    for (const [name, content] of documents) if (!before.get(name)?.equals(content)) {
      await client.query('INSERT INTO opengym_documents(name,content) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET content=EXCLUDED.content,updated_at=now()', [name,content]);
    }
    for (const name of before.keys()) if (!documents.has(name)) await client.query('DELETE FROM opengym_documents WHERE name=$1', [name]);
    await client.query('COMMIT'); return out;
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}
class BufferedResponse {
  headers = {}; statusCode = 200; headersSent = false; chunks = [];
  setHeader(k,v) { this.headers[k] = v; }
  writeHead(status, headers = {}) { this.statusCode = status; Object.assign(this.headers, headers); this.headersSent = true; }
  end(chunk) { if (chunk != null) this.chunks.push(Buffer.from(chunk)); this.headersSent = true; }
  destroy() { throw new Error('Response interrupted'); }
}
export default async function cloud(req, res) {
  const run = queue.catch(() => {}).then(() => transaction(async () => {
    // No automatic parsing: upstream enforces its own body-size limit.
    app ||= await import('./server.js');
    const runtime = documents.get('_runtime.json');
    app.restoreRuntime(runtime ? JSON.parse(runtime) : {});
    const reply = new BufferedResponse();
    await app.requestHandler(req, reply);
    documents.set('_runtime.json', Buffer.from(JSON.stringify(app.snapshotRuntime())));
    if (reply.statusCode >= 500) throw new Error('Upstream request failed');
    return reply;
  }));
  queue = run.then(() => {}, () => {});
  try { const reply = await run; res.writeHead(reply.statusCode, { ...reply.headers, 'Cache-Control': 'no-store' }); res.end(Buffer.concat(reply.chunks)); }
  catch (e) { console.error('cloud request failed', e.code || e.name, e.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '5' }); res.end(JSON.stringify({ error: 'Não foi possível salvar ou consultar seus dados. Tente novamente.' })); }
}
