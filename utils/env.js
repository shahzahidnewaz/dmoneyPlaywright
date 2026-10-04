const fs = require('fs');
const path = require('path');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(path.join(__dirname, '..', '.env'));

function env(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

module.exports = { env };
