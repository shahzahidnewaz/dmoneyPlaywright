const { env } = require('./env');

const API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const usedIds = new Set();
let cachedToken = null;

async function getAccessToken() {
  const { GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_ACCESS_TOKEN } = process.env;
  if (!(GMAIL_REFRESH_TOKEN && GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET)) {
    if (GMAIL_ACCESS_TOKEN) return GMAIL_ACCESS_TOKEN;
    throw new Error(
      'Gmail access is not configured. Set GMAIL_ACCESS_TOKEN, or all three of GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN in .env.',
    );
  }
  if (cachedToken && Date.now() - cachedToken.at < 45 * 60_000) return cachedToken.value;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GMAIL_CLIENT_ID'),
      client_secret: env('GMAIL_CLIENT_SECRET'),
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  cachedToken = { value: (await res.json()).access_token, at: Date.now() };
  return cachedToken.value;
}

async function gmailGet(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
  return res.json();
}

const decode = (data) => Buffer.from(data, 'base64url').toString('utf8');

function bodyText(payload) {
  const queue = [payload];
  let html = '';
  while (queue.length) {
    const part = queue.shift();
    if (part.mimeType === 'text/plain' && part.body?.data) return decode(part.body.data);
    if (part.mimeType === 'text/html' && part.body?.data) html = decode(part.body.data);
    if (part.parts) queue.push(...part.parts);
  }
  return html
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&');
}

async function listMailIds({ to, subject }) {
  const query = encodeURIComponent(`to:${to} subject:(${subject})`);
  const list = await gmailGet(`${API}?q=${query}&maxResults=10`);
  return (list.messages ?? []).map((m) => m.id);
}

async function snapshotMail({ to, subject }) {
  return new Set(await listMailIds({ to, subject }));
}

async function waitForMail({ to, subject, known = new Set(), timeoutMs = 120_000, intervalMs = 3_000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const id of await listMailIds({ to, subject })) {
      if (known.has(id) || usedIds.has(id)) continue;
      usedIds.add(id);
      return bodyText((await gmailGet(`${API}/${id}?format=full`)).payload);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`No new mail to ${to} with subject "${subject}" arrived within ${timeoutMs / 1000}s`);
}

const extractOtp = (body) => body.match(/is:\s*(\d{4})\b/)?.[1] ?? null;

function extractResetPath(body) {
  const link = body.match(/https?:\/\/\S*reset-password\?token=[\w.~%+-]+/)?.[0];
  if (!link) return null;
  const url = new URL(link);
  return url.pathname + url.search;
}

module.exports = { snapshotMail, waitForMail, extractOtp, extractResetPath };
