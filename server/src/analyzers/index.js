// Strategy dispatch: picks the analyzer for a submission's language.
const javascript = require('./javascript');
const python = require('./python');

const ANALYZERS = { javascript, python };

async function runStaticAnalysis(language, code) {
  const analyzer = ANALYZERS[language];
  if (!analyzer) return [];
  return analyzer.analyze(code);
}

module.exports = { runStaticAnalysis };
