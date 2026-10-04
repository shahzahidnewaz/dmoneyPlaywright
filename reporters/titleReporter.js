const ICONS = { passed: '✓', failed: '✘', timedOut: '✘', interrupted: '✘', skipped: '-' };
const stripAnsi = (text) => String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');

class TitleReporter {
  constructor() {
    this.counts = {};
    this.failures = [];
  }

  onTestEnd(test, result) {
    const number = test.annotations.find((a) => a.type === 'number')?.description;
    const label = number ? `${number}. ${test.title}` : test.title;
    console.log(`${ICONS[result.status] ?? '?'} ${label}`);
    this.counts[result.status] = (this.counts[result.status] ?? 0) + 1;
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failures.push(`${label}\n${stripAnsi(result.error?.message)}`);
    }
  }

  onError(error) {
    console.log(`ERROR: ${stripAnsi(error.message ?? error)}`);
  }

  onEnd() {
    const parts = Object.entries(this.counts).map(([status, n]) => `${n} ${status}`);
    console.log(`\n${parts.join(', ')}`);
    for (const failure of this.failures) console.log(`\nFAILED: ${failure}`);
  }

  printsToStdio() {
    return true;
  }
}

module.exports = TitleReporter;
