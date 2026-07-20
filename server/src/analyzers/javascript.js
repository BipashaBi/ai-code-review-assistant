// JavaScript static analysis via ESLint's Node API (no shell exec).
// Uses an in-memory flat config so no eslint.config.js is required.
const { Linter } = require('eslint');

const linter = new Linter();

// Curated recommended-style rule set for reviewing arbitrary snippets.
const RULES = {
  'no-unused-vars': 'warn',
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-constant-condition': 'warn',
  'no-empty': 'warn',
  'eqeqeq': 'warn',
  'no-var': 'warn',
  'prefer-const': 'warn',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-fallthrough': 'error',
  'no-compare-neg-zero': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-console': 'off',
};

// Common globals so `console`, `document`, `require` etc. don't all flag no-undef.
const GLOBALS = Object.fromEntries(
  ['console','process','require','module','exports','window','document','fetch',
   'setTimeout','setInterval','clearTimeout','clearInterval','Promise','JSON',
   'Math','Date','Buffer','URL','__dirname','__filename']
    .map(g => [g, 'readonly'])
);

function severityOf(eslintSeverity, ruleId) {
  if (ruleId === 'no-eval' || ruleId === 'no-implied-eval') return 'critical';
  return eslintSeverity === 2 ? 'error' : 'warning';
}

const CATEGORY = {
  'no-eval': 'security', 'no-implied-eval': 'security',
  'no-unused-vars': 'style', 'no-var': 'style', 'prefer-const': 'style', 'eqeqeq': 'style',
};

async function analyze(code) {
  const messages = linter.verify(code, {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: GLOBALS,
    },
    rules: RULES,
  });

  return messages.map(m => ({
    severity: m.fatal ? 'error' : severityOf(m.severity, m.ruleId),
    category: m.fatal ? 'bug' : (CATEGORY[m.ruleId] || 'bug'),
    rule: m.ruleId || 'parse-error',
    issue: m.message,
    explanation: m.fatal
      ? 'The code could not be parsed. Fix the syntax error before other checks can run.'
      : null,
    suggested_fix: m.fix ? 'Auto-fixable by ESLint (--fix).' : null,
    line_number: m.line || null,
    column_number: m.column || null,
  }));
}

module.exports = { analyze };
