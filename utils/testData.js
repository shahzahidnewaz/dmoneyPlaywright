const { env } = require('./env');

function getAccounts() {
  return {
    admin: { email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD') },
    system: { email: env('SYSTEM_EMAIL'), password: env('SYSTEM_PASSWORD'), phone: 'SYSTEM' },
    customerPhone: env('CUSTOMER_PHONE', '01686606903'),
    commissionRate: Number(env('COMMISSION_RATE', '0.025')),
  };
}

function createAgent() {
  const [local, domain] = env('AGENT_GMAIL').split('@');
  const stamp = String(Date.now());
  const id = Math.floor(Date.now() / 1000).toString(36);
  return {
    name: `Auto Agent ${id}`,
    email: `${local}+${id}@${domain}`,
    phone: `017${stamp.slice(-8)}`,
    nid: stamp.slice(-10),
    password: 'Agent@1234',
    newPassword: 'Agent@5678',
  };
}

function createCustomer() {
  const [local, domain] = env('AGENT_GMAIL').split('@');
  const id = Math.floor(Date.now() / 1000).toString(36);
  const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
  return {
    name: `Auto Customer ${id}`,
    email: `${local}+c${id}@${domain}`,
    phone: `018${digits(8)}`,
    nid: `1${digits(9)}`,
    password: 'Customer@1234',
  };
}

module.exports = { getAccounts, createAgent, createCustomer };
