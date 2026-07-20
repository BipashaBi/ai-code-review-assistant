// AI review stage: sends code + static findings to an LLM (Anthropic Messages API),
// expects strict JSON back, parses defensively.
// If no API key is configured, the stage is skipped gracefully and reviews
// still complete with static findings only.

// Provider selection: GROQ_API_KEY (free tier) takes priority if set,
// otherwise ANTHROPIC_API_KEY. Both return plain text we parse the same way.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildPrompt(submission, staticFindings) {
  const staticSummary = staticFindings.length
    ? staticFindings.map(f => `- L${f.line_number || '?'} [${f.severity}] ${f.rule}: ${f.issue}`).join('\n')
    : '(none)';

  return `You are a senior code reviewer. Review the following ${submission.language} code.

A static analyzer already found these issues (do NOT repeat them):
${staticSummary}

Look for DEEPER issues the linter cannot catch: logic bugs, edge cases (empty input, null, off-by-one),
code smells, naming problems, performance issues, security risks, and missing error handling.

Respond with ONLY a JSON object, no markdown fences, no prose, in exactly this shape:
{
  "summary": "2-3 sentence overall assessment of the code",
  "findings": [
    {
      "severity": "critical|error|warning|info",
      "category": "bug|security|performance|naming|style|complexity",
      "issue": "short title of the problem",
      "explanation": "why this is a problem",
      "suggested_fix": "concrete code or instruction to fix it",
      "line_number": 3
    }
  ]
}

If the code is genuinely fine, return an empty findings array with a positive summary.

CODE TO REVIEW:
\`\`\`${submission.language}
${submission.code}
\`\`\``;
}

function parseAiJson(text) {
  // Strip markdown fences if the model added them despite instructions.
  const clean = text.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response');
  const parsed = JSON.parse(clean.slice(start, end + 1));

  const VALID_SEV = new Set(['critical', 'error', 'warning', 'info']);
  const findings = (Array.isArray(parsed.findings) ? parsed.findings : [])
    .filter(f => f && f.issue)
    .map(f => ({
      severity: VALID_SEV.has(f.severity) ? f.severity : 'info',
      category: f.category || 'bug',
      rule: null,
      issue: String(f.issue).slice(0, 300),
      explanation: f.explanation ? String(f.explanation) : null,
      suggested_fix: f.suggested_fix ? String(f.suggested_fix) : null,
      line_number: Number.isInteger(f.line_number) ? f.line_number : null,
      column_number: null,
    }));

  return { summary: parsed.summary ? String(parsed.summary) : null, findings };
}

async function callModel(prompt, maxTokens = 2000) {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey && !anthropicKey) return null; // AI stage disabled

  let res;
  if (groqKey) {
    // Groq free tier — OpenAI-compatible chat completions format
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } else {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  if (groqKey) return data.choices?.[0]?.message?.content || '';
  return (data.content || []).map(b => (b.type === 'text' ? b.text : '')).join('\n');
}

async function aiReview(submission, staticFindings) {
  const text = await callModel(buildPrompt(submission, staticFindings));
  if (text === null) return { enabled: false, summary: null, findings: [] };
  const { summary, findings } = parseAiJson(text);
  return { enabled: true, summary, findings };
}

async function generateDocs(submission) {
  const prompt = `Add professional documentation to this ${submission.language} code:
${submission.language === 'python' ? 'docstrings (Google style)' : 'JSDoc comments'} for every function and class,
plus a short header comment describing the module. Do not change any logic.
Respond with ONLY the documented code, no markdown fences, no explanation.

\`\`\`${submission.language}
${submission.code}
\`\`\``;
  const text = await callModel(prompt, 3000);
  if (text === null) return null; // disabled
  return text.replace(/^```[a-z]*\n?/m, '').replace(/```\s*$/m, '').trim();
}

module.exports = { aiReview, generateDocs };