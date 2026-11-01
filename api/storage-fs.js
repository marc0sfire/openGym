// Synchronous compatibility boundary for the upstream document API. On Vercel these
// bytes live only in memory during a PostgreSQL transaction, never on local disk.
import fs from 'node:fs';
import path from 'node:path';
export const documents = new Map();
export const databaseMode = process.env.SERVERLESS === '1';
const root = path.resolve(process.env.DATA_DIR || '/data');
const keyOf = p => typeof p === 'string' && path.resolve(p).startsWith(root + '/') ? path.relative(root, path.resolve(p)) : null;
const missing = p => Object.assign(new Error('Document unavailable'), { code: 'ENOENT', path: p });
const bytes = p => { const b = documents.get(keyOf(p)); if (!b) throw missing(p); return b; };
const memory = {
  readFileSync(p, encoding) { const b = bytes(p); return encoding ? b.toString(typeof encoding === 'string' ? encoding : encoding.encoding) : Buffer.from(b); },
  writeFileSync(p, value) { documents.set(keyOf(p), Buffer.from(value)); },
  appendFileSync(p, value) { documents.set(keyOf(p), Buffer.concat([documents.get(keyOf(p)) || Buffer.alloc(0), Buffer.from(value)])); },
  existsSync(p) { return documents.has(keyOf(p)); },
  unlinkSync(p) { if (!documents.delete(keyOf(p))) throw missing(p); },
  copyFileSync(a, b) { documents.set(keyOf(b), Buffer.from(bytes(a))); },
  renameSync(a, b) { documents.set(keyOf(b), bytes(a)); documents.delete(keyOf(a)); },
  statSync(p) { return { size: bytes(p).length, mtimeMs: Date.now(), isFile: () => true }; },
  mkdirSync() {}, chmodSync() {},
};
export default new Proxy(fs, { get(target, name) {
  if (!databaseMode || !memory[name]) return target[name];
  return (...args) => keyOf(args[0]) !== null || name === 'mkdirSync' && path.resolve(args[0]) === root
    ? memory[name](...args) : target[name](...args);
} });
