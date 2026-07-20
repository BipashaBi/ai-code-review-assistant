const pool = require('../db/pool');
const { ApiError } = require('../middleware/errorHandler');
const { startReview } = require('../services/review.service');

const EXT_TO_LANG = { '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.py': 'python' };
const SUPPORTED = new Set(['javascript', 'python']);
const MAX_CODE_BYTES = 100 * 1024;

exports.create = async (req, res, next) => {
  try {
    let { title, language, code } = req.body || {};
    let sourceType = 'paste';
    let fileName = null;

    if (req.file) {
      sourceType = 'file';
      fileName = req.file.originalname;
      code = req.file.buffer.toString('utf8');
      const ext = (fileName.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      language = language || EXT_TO_LANG[ext];
      title = title || fileName;
      if (!language)
        throw new ApiError(400, 'UNSUPPORTED_LANGUAGE',
          `Cannot infer language from "${ext || 'no extension'}". Supported: .js, .jsx, .mjs, .py`);
    }

    if (!title || !language || !code)
      throw new ApiError(400, 'VALIDATION', 'title, language and code are required');
    if (!SUPPORTED.has(language))
      throw new ApiError(400, 'UNSUPPORTED_LANGUAGE', `Supported languages: ${[...SUPPORTED].join(', ')}`);
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES)
      throw new ApiError(400, 'FILE_TOO_LARGE', 'Code exceeds 100KB limit');

    const { rows } = await pool.query(
      `INSERT INTO submissions (user_id, title, source_type, language, code, file_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, source_type, language, file_name, created_at`,
      [req.user.id, title.trim().slice(0, 200), sourceType, language, code, fileName]
    );
    res.status(201).json({ submission: rows[0] });
  } catch (err) { next(err); }
};

exports.createReview = async (req, res, next) => {
  try {
    const { rows: subRows } = await pool.query(
      'SELECT id, language, code FROM submissions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const submission = subRows[0];
    if (!submission) throw new ApiError(404, 'NOT_FOUND', 'Submission not found');

    const { rows } = await pool.query(
      `INSERT INTO reviews (submission_id) VALUES ($1) RETURNING id, status, created_at`,
      [submission.id]
    );
    const review = rows[0];

    // Fire-and-forget async pipeline (Days 6–9 fill in the real analyzers)
    startReview(review.id, submission).catch(err =>
      console.error(`review ${review.id} pipeline error:`, err)
    );

    res.status(202).json({ review });
  } catch (err) { next(err); }
};
