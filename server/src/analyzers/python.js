// Python static analysis: spawns pylint with JSON output.
// Requires python3 + pylint on the host (documented in README).
const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const SEVERITY_MAP = {
  fatal: 'critical',
  error: 'error',
  warning: 'warning',
  convention: 'info',
  refactor: 'info',
};

const CATEGORY_MAP = {
  fatal: 'bug', error: 'bug', warning: 'bug',
  convention: 'style', refactor: 'complexity',
};

function runPylint(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(cmd, ['-m', 'pylint', '--output-format=json2', '--disable=C0114,C0115,C0116', filePath], {
      timeout: 20000,
    });
    let out = '', err = '';
    proc.stdout.on('data', d => (out += d));
    proc.stderr.on('data', d => (err += d));
    proc.on('error', reject); // python not installed etc.
    proc.on('close', () => {
      // pylint exits non-zero when it finds issues; that's not a failure.
      try {
        const parsed = JSON.parse(out);
        resolve(parsed.messages || parsed); // json2 wraps in {messages}, json is a bare array
      } catch {
        reject(new Error(`pylint produced no JSON output. stderr: ${err.slice(0, 200)}`));
      }
    });
  });
}

async function analyze(code) {
  const tmp = path.join(os.tmpdir(), `acra_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
  await fs.writeFile(tmp, code, 'utf8');
  try {
    const messages = await runPylint(tmp);
    return messages.map(m => ({
      severity: SEVERITY_MAP[m.type] || 'info',
      category: CATEGORY_MAP[m.type] || 'style',
      rule: `${m.messageId || m['message-id'] || ''} (${m.symbol || ''})`.trim(),
      issue: m.message,
      explanation: null,
      suggested_fix: null,
      line_number: m.line || null,
      column_number: m.column || null,
    }));
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

module.exports = { analyze };
