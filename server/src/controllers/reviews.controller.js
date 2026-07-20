const pool = require('../db/pool');
const { ApiError } = require('../middleware/errorHandler');
const { generateDocs } = require('../ai/llm');

exports.getOne = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, s.title, s.language, s.code, s.file_name, s.user_id
       FROM reviews r JOIN submissions s ON s.id = r.submission_id
       WHERE r.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    const row = rows[0];
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Review not found');

    const { rows: findings } = await pool.query(
      `SELECT id, stage, severity, category, rule, issue, explanation,
              suggested_fix, line_number, column_number
       FROM review_findings WHERE review_id = $1
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'error' THEN 1
                              WHEN 'warning' THEN 2 ELSE 3 END, line_number NULLS LAST`,
      [row.id]
    );

    res.json({
      review: {
        id: row.id,
        status: row.status,
        overall_score: row.overall_score,
        summary: row.summary,
        metrics: row.metrics,
        error_message: row.error_message,
        generated_docs: row.generated_docs,
        created_at: row.created_at,
        completed_at: row.completed_at,
        submission: {
          id: row.submission_id, title: row.title,
          language: row.language, code: row.code, file_name: row.file_name,
        },
        findings,
      },
    });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const values = [req.user.id];
    let where = 's.user_id = $1';
    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      where += ` AND (s.title ILIKE $${values.length} OR r.summary ILIKE $${values.length})`;
    }
    if (req.query.language) {
      values.push(req.query.language);
      where += ` AND s.language = $${values.length}`;
    }
    if (req.query.severity) {
      values.push(req.query.severity);
      where += ` AND EXISTS (SELECT 1 FROM review_findings f
                 WHERE f.review_id = r.id AND f.severity = $${values.length})`;
    }

    const base = `FROM reviews r JOIN submissions s ON s.id = r.submission_id WHERE ${where}`;
    const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*)::int AS count ${base}`, values);

    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.overall_score, r.created_at,
              s.title, s.language,
              (SELECT COUNT(*)::int FROM review_findings f
                WHERE f.review_id = r.id AND f.severity IN ('error','critical')) AS error_count,
              (SELECT COUNT(*)::int FROM review_findings f
                WHERE f.review_id = r.id AND f.severity = 'warning') AS warning_count
       ${base}
       ORDER BY r.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    );

    res.json({ reviews: rows, total: count, page, limit });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM reviews r USING submissions s
       WHERE r.id = $1 AND s.id = r.submission_id AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) throw new ApiError(404, 'NOT_FOUND', 'Review not found');
    res.status(204).end();
  } catch (err) { next(err); }
};

exports.generateDocumentation = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, s.language, s.code
       FROM reviews r JOIN submissions s ON s.id = r.submission_id
       WHERE r.id = $1 AND s.user_id = $2`,
      [req.params.id, req.user.id]
    );
    const row = rows[0];
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Review not found');

    const docs = await generateDocs({ language: row.language, code: row.code });
    if (docs === null)
      throw new ApiError(503, 'AI_DISABLED', 'Documentation generation requires an AI API key on the server.');

    await pool.query('UPDATE reviews SET generated_docs = $2 WHERE id = $1', [row.id, docs]);
    res.json({ generated_docs: docs });
  } catch (err) { next(err); }
};
