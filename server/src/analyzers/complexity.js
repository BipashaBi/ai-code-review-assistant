// Approximate complexity metrics, language-agnostic.
// Cyclomatic complexity ≈ 1 + number of decision points.

const DECISION_PATTERNS = {
  javascript: /\bif\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|&&|\|\||\?[^.:]/g,
  python: /\bif\b|\belif\b|\bfor\b|\bwhile\b|\bexcept\b|\band\b|\bor\b/g,
};

function computeMetrics(language, code) {
  const lines = code.split('\n');
  const loc = lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//') && !l.trim().startsWith('#')).length;

  const fnPattern = language === 'python' ? /\bdef\s+\w+/g : /\bfunction\b|=>/g;
  const functions = (code.match(fnPattern) || []).length;
  const classes = (code.match(/\bclass\s+\w+/g) || []).length;

  const decisions = (code.match(DECISION_PATTERNS[language] || DECISION_PATTERNS.javascript) || []).length;
  const cyclomatic = 1 + decisions;
  const avgComplexityPerFunction = functions > 0 ? Math.round((cyclomatic / functions) * 10) / 10 : cyclomatic;

  const longestLine = Math.max(0, ...lines.map(l => l.length));
  const maxNesting = estimateMaxNesting(language, lines);

  return {
    loc,
    total_lines: lines.length,
    functions,
    classes,
    cyclomatic_complexity: cyclomatic,
    avg_complexity_per_function: avgComplexityPerFunction,
    max_nesting_depth: maxNesting,
    longest_line: longestLine,
  };
}

function estimateMaxNesting(language, lines) {
  if (language === 'python') {
    let max = 0;
    for (const line of lines) {
      if (line.trim() === '') continue;
      const indent = line.match(/^\s*/)[0].replace(/\t/g, '    ').length;
      max = Math.max(max, Math.floor(indent / 4));
    }
    return max;
  }
  let depth = 0, max = 0;
  for (const ch of lines.join('\n')) {
    if (ch === '{') { depth++; max = Math.max(max, depth); }
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  return max;
}

module.exports = { computeMetrics };
