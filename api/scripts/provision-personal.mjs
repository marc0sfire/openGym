// Run locally with DATABASE_URL. Prints one-time invitations; never commit output.
process.env.SERVERLESS = '1'; process.env.DATA_DIR = '/opengym-memory';
const { randomBytes } = await import('node:crypto');
const { documents } = await import('../storage-fs.js');
const { transaction, database } = await import('../cloud.js');
const invitations = [];
await transaction(async () => {
  const raw = documents.get('db.json');
  const db = raw ? JSON.parse(raw) : { users: [], creds: [], invites: [], subs: [] };
  for (const personalName of ['Marcos','Marih']) {
    if (db.users.some(u => u.name === personalName)) continue;
    let invite = db.invites.find(i=>i.personalName===personalName && !i.usedBy && !i.revoked);
    if (!invite) { invite = { code: randomBytes(16).toString('hex').toUpperCase(), personalName, created: new Date().toISOString() }; db.invites.push(invite); }
    invitations.push({ name: personalName, code: invite.code });
  }
  documents.set('db.json', Buffer.from(JSON.stringify(db)));
});
console.log(JSON.stringify(invitations));
await database().end();
