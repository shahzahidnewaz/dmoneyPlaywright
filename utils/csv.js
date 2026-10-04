const fs = require('fs');
const path = require('path');

function escapeCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

function todayStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function saveSelfStatementCsv(headers, rows, dir = 'output') {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `self_statement_${todayStamp()}.csv`);
  fs.writeFileSync(file, toCsv(headers, rows), 'utf8');
  return file;
}

module.exports = { toCsv, todayStamp, saveSelfStatementCsv };
