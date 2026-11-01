// Vercel entry point. Keep native projects and the original standalone API separate.
process.env.SERVERLESS = '1';
process.env.DATA_DIR = '/opengym-memory';
process.env.DEFAULT_LANG = 'pt-BR';
process.env.ALLOW_GUEST = '0';
process.env.PASSWORD_LOGIN = '1';
process.env.INVITE_ONLY = '1';
process.env.MEDIA_UPLOADS = '0';
process.env.COACH_DISABLED = '1';
process.env.AUDIT_LOG = '0';
export const config = { api: { bodyParser: false } };
export default async function handler(req, res) {
  const { default: cloud } = await import('./cloud.js');
  return cloud(req, res);
}
