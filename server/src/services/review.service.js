// Review pipeline orchestrator — full two-stage design.
// Stage 1: static analysis (ESLint / Pylint) → findings with stage='static'
// Stage 2: AI review (LLM, structured JSON)  → findings with stage='ai'
// Runs asynchronously; the reviews.status column tracks progress.
const pool = require('../db/pool');
const { runStaticAnalysis } = require('../analyzers');
const { computeMetrics } = require('../analyzers/complexity');
const { aiReview } = require('../ai/llm');

const PENALTY = { critical: 25, error: 10, warning: 4, info: 1 };

function computeScore(findings) {
  const penalty = findings.reduce((sum, f) => sum + (PENALTY[f.severity] || 0), 0);
  return Math.max(0, 100 - penalty);
}

function countBySeverity(findings) {
  const counts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  return ['critical', 'error', 'warning', 'info']
    .filter(s => counts[s])
    .map(s => `${counts[s]} ${s}${counts[s] > 1 ? 's' : ''}`)
    .join(', ');
}

function buildSummary(staticFindings, ai, metrics) {
  const parts = [];
  parts.push(staticFindings.length
    ? `Static analysis flagged ${countBySeverity(staticFindings)}.`
    : 'Static analysis found no issues.');
  if (ai.enabled && ai.summary) {
    parts.push(`AI review: ${ai.summary}`);
  } else if (!ai.enabled) {
    parts.push('AI review was skipped (no AI API key configured on the server).');
  }
  parts.push(`Cyclomatic complexity: ${metrics.cyclomatic_complexity} across ${metrics.loc} lines of code.`);
  return parts.join(' ');
}

async function insertFindings(reviewId, stage, findings) {
  for (const f of findings) {
    await pool.query(
      `INSERT INTO review_findings
         (review_id, stage, severity, category, rule, issue, explanation, suggested_fix, line_number, column_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [reviewId, stage, f.severity, f.category, (f.rule || '').slice(0, 100) || null,
       (f.issue || 'Issue').slice(0, 300), f.explanation, f.suggested_fix,
       f.line_number, f.column_number]
    );
  }
}

async function startReview(reviewId, submission) {
  try {
    await pool.query(
      `UPDATE reviews SET status = 'running', started_at = NOW() WHERE id = $1`, [reviewId]
    );

    // Stage 1 — static
    const staticFindings = await runStaticAnalysis(submission.language, submission.code);
    await insertFindings(reviewId, 'static', staticFindings);

    // Stage 2 — AI (receives the static findings as context; skipped if no key)
    let ai = { enabled: false, summary: null, findings: [] };
    try {
      ai = await aiReview(submission, staticFindings);
      await insertFindings(reviewId, 'ai', ai.findings);
    } catch (aiErr) {
      // AI failure should not fail the whole review — static results still land.
      console.error(`review ${reviewId}: AI stage failed:`, aiErr.message);
      ai = { enabled: true, summary: `AI stage errored (${aiErr.message.slice(0, 120)}); static results shown.`, findings: [] };
    }

    const allFindings = [...staticFindings, ...ai.findings];
    const metrics = computeMetrics(submission.language, submission.code);
    const score = computeScore(allFindings);
    const summary = buildSummary(staticFindings, ai, metrics);

    await pool.query(
      `UPDATE reviews SET status = 'completed', summary = $2, overall_score = $3,
                          metrics = $4, completed_at = NOW()
       WHERE id = $1`,
      [reviewId, summary, score, JSON.stringify(metrics)]
    );
  } catch (err) {
    await pool.query(
      `UPDATE reviews SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1`,
      [reviewId, String(err.message || err).slice(0, 500)]
    ).catch(() => {});
    throw err;
  }
}

module.exports = { startReview };
