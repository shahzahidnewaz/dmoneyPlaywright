const fs = require('fs');
const path = require('path');

const TARGETS = ['output', 'test-results', 'playwright-report', 'blob-report'];

function clean(root = path.join(__dirname, '..'), targets = TARGETS) {
  const removed = [];
  for (const target of targets) {
    const full = path.join(root, target);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
      removed.push(target);
    }
  }
  return removed;
}

if (require.main === module) {
  const removed = clean();
  console.log(removed.length ? `Removed: ${removed.join(', ')}` : 'Nothing to clean.');
}

module.exports = { clean };
