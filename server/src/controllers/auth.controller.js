const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const { ApiError } = require('../middleware/errorHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      throw new ApiError(400, 'VALIDATION', 'name, email and password are required');
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'VALIDATION', 'Invalid email');
    if (password.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const user = rows[0];
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    if (err.code === '23505') return next(new ApiError(409, 'EMAIL_EXISTS', 'Email already registered'));
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'VALIDATION', 'email and password are required');

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]
    );
    if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'User not found');
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, password } = req.body || {};
    if (!name && !password) throw new ApiError(400, 'VALIDATION', 'Nothing to update');
    if (password && password.length < 8)
      throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters');

    const fields = [];
    const values = [];
    if (name) { values.push(name.trim()); fields.push(`name = $${values.length}`); }
    if (password) {
      values.push(await bcrypt.hash(password, 10));
      fields.push(`password_hash = $${values.length}`);
    }
    values.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, email, created_at`,
      values
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (email) {
      const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (rows[0]) {
        // Email delivery is intentionally stubbed for this project scope.
        // In production: store hashed token with expiry, email a reset link.
        const token = crypto.randomBytes(24).toString('hex');
        console.log(`[dev] password reset token for ${email}: ${token}`);
      }
    }
    // Always the same response — never reveal whether the email exists.
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) { next(err); }
};
