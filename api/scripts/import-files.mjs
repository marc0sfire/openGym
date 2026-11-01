// Non-destructive one-time import. Originals remain untouched. Refuses nonempty DB.
// node api/scripts/import-files.mjs /absolute/path/to/data
process.env.SERVERLESS = '1'; process.env.DATA_DIR = '/opengym-memory';
const fs = await import('node:fs/promises');
const path = await import('node:path');
const { documents } = await import('../storage-fs.js');
const { transaction, database } = await import('../cloud.js');
const dir = process.argv[2];
if (!dir) throw new Error('Informe a pasta data original, após fazer backup.');
await transaction(async () => {
  if (documents.size) throw new Error('Banco já contém dados; importação recusada para evitar sobrescrita.');
  const names = await fs.readdir(dir);
  if (!names.includes('db.json') || !names.includes('secret')) throw new Error('Backup incompleto: db.json e secret são obrigatórios.');
  if (names.includes('uploads')) throw new Error('Há uploads no backup. Migre a mídia para armazenamento de objetos antes de importar; nada foi alterado.');
  for (const name of names.filter(n=>['db.json','db.json.bak','secret','vapid.json'].includes(n) || /^state-[a-zA-Z0-9_-]+\.json$/.test(n))) {
    const bytes = await fs.readFile(path.join(dir,name));
    if (name.endsWith('.json')) JSON.parse(bytes);
    documents.set(name,bytes);
  }
});
console.log('Importação concluída sem alterar os arquivos originais.');
await database().end();
