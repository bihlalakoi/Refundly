require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = Boolean(process.env.VERCEL);
let authSchemaInitialized = false;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const PASSWORD_MIN_LENGTH = 8;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf']);

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function ensureStrongSessionSecret() {
  const sessionSecret = getRequiredEnv('SESSION_SECRET');
  const tooShort = sessionSecret.length < 32;
  const weakPatterns = ['replace-with-long-random-secret', 'change-in-production', 'secret-key'];
  const looksWeak = weakPatterns.some((pattern) => sessionSecret.toLowerCase().includes(pattern));

  if (tooShort || looksWeak) {
    if (!isProduction) {
      console.warn(
        'Warning: SESSION_SECRET looks weak. Use a random secret at least 32 characters long before production deployment.'
      );
      return;
    }
    throw new Error(
      'SESSION_SECRET is too weak. Use a random secret at least 32 characters long in all environments.'
    );
  }
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function ensureCsrfToken(req) {
  if (!req.session) {
    return null;
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  return req.session.csrfToken;
}

function requireCsrf(req, res, next) {
  const expected = req.session?.csrfToken;
  const provided = req.get('x-csrf-token');

  if (!expected || !provided || provided !== expected) {
    return res.status(403).json({
      success: false,
      message: 'Invalid security token. Refresh the page and try again.'
    });
  }

  return next();
}

function normalizeText(value, maxLength = 5000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return normalizeText(value, 320).toLowerCase();
}

function parseAmount(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return null;
}

function normalizeBcryptHash(hash = '') {
  // Node bcrypt doesn't support $2y$ prefix directly, convert to $2b$.
  return hash.startsWith('$2y$') ? `$2b$${hash.slice(4)}` : hash;
}

function getAppBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${protocol}://${req.get('host')}`;
  }

  return `http://localhost:${PORT}`;
}

async function ensureAuthSchema() {
  if (authSchemaInitialized) return;

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS supabase_user_id UUID
  `);

  authSchemaInitialized = true;
}

async function verifyPassword(plainTextPassword, storedPassword) {
  if (!storedPassword) return false;
  const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
  if (isBcryptHash) {
    return bcrypt.compare(plainTextPassword, normalizeBcryptHash(storedPassword));
  }
  // Legacy fallback for pre-hash records.
  return plainTextPassword === storedPassword;
}

// Database configuration
const pool = new Pool({
  host: getRequiredEnv('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: getRequiredEnv('DB_NAME'),
  user: getRequiredEnv('DB_USER'),
  password: getRequiredEnv('DB_PASSWORD'),
  ssl: {
    rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false') === 'true'
  }
});

const hasSupabaseAuthConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const supabaseAuthClient = hasSupabaseAuthConfig
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

function getSupabaseAuthClient() {
  if (!supabaseAuthClient) {
    throw new Error('Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }
  return supabaseAuthClient;
}

async function upsertLocalUserFromSupabase(supabaseUser, fallbackName = null, fallbackPhone = null) {
  const email = supabaseUser.email;
  const supabaseUserId = supabaseUser.id;
  const metadata = supabaseUser.user_metadata || {};
  const name = fallbackName || metadata.full_name || email.split('@')[0];
  const phone = fallbackPhone || metadata.phone || null;
  const verified = Boolean(supabaseUser.email_confirmed_at);

  const existing = await pool.query(
    'SELECT id, name FROM users WHERE supabase_user_id = $1 OR email = $2 LIMIT 1',
    [supabaseUserId, email]
  );

  if (existing.rows.length > 0) {
    const current = existing.rows[0];
    await pool.query(
      'UPDATE users SET supabase_user_id = $1, email = $2, name = COALESCE($3, name), phone = COALESCE($4, phone), email_verified = $5 WHERE id = $6',
      [supabaseUserId, email, name, phone, verified, current.id]
    );
    return { id: current.id, name: name || current.name };
  }

  const placeholderPassword = await bcrypt.hash(crypto.randomUUID(), 10);
  const insert = await pool.query(
    'INSERT INTO users (name, email, password, phone, email_verified, supabase_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name',
    [name, email, placeholderPassword, phone, verified, supabaseUserId]
  );

  return insert.rows[0];
}

// Middleware
if (isProduction) {
  // Required so secure session cookies work behind Vercel/other proxies.
  app.set('trust proxy', 1);
}
app.use('/uploads', (req, res) => {
  res.status(403).json({ success: false, message: 'Direct file access is disabled.' });
});
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
ensureStrongSessionSecret();
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: getRequiredEnv('SESSION_SECRET'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// File upload configuration
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isMimeAllowed = ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype);
    const isExtAllowed = ALLOWED_UPLOAD_EXTENSIONS.has(ext);
    if (!isMimeAllowed || !isExtAllowed) {
      return cb(new Error('Only JPG, PNG, GIF, and PDF files are allowed.'));
    }
    return cb(null, true);
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo.html'));
});

app.get('/api/csrf-token', (req, res) => {
  const token = ensureCsrfToken(req);
  if (!token) {
    return res.status(500).json({ success: false, message: 'Session is unavailable.' });
  }
  res.json({ success: true, csrfToken: token });
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    await ensureAuthSchema();
    const name = normalizeText(req.body.name, 100);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const phone = normalizeText(req.body.phone, 30);

    // Validation
    if (!name || !email || !password) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.json({ success: false, message: passwordError });
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getAppBaseUrl(req)}/verify-email.html`,
        data: {
          full_name: name,
          phone: phone || null
        }
      }
    });

    if (error) {
      return res.json({ success: false, message: error.message || 'Registration failed' });
    }

    if (!data.user) {
      return res.json({ success: false, message: 'Unable to create account. Please try again.' });
    }

    const localUser = await upsertLocalUserFromSupabase(data.user, name, phone);
    const requiresVerification = !data.user.email_confirmed_at;

    if (!requiresVerification) {
      req.session.userId = localUser.id;
      req.session.userName = localUser.name;
    }

    res.json({
      success: true,
      requiresVerification,
      email,
      message: requiresVerification
        ? 'Account created. Please check your email to verify your account.'
        : 'Account created successfully!'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    await ensureAuthSchema();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const message = error?.message || 'Invalid email or password';
      if (/confirm|verified|not confirmed/i.test(message)) {
        return res.json({
          success: false,
          requiresVerification: true,
          email,
          message: 'Please verify your email before logging in.'
        });
      }
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    if (!data.user.email_confirmed_at) {
      return res.json({
        success: false,
        requiresVerification: true,
        email,
        message: 'Please verify your email before logging in.'
      });
    }

    const localUser = await upsertLocalUserFromSupabase(data.user);

    req.session.userId = localUser.id;
    req.session.userName = localUser.name;
    ensureCsrfToken(req);

    res.json({ success: true, message: 'Login successful!' });

  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, message: 'Login failed. Please try again.' });
  }
});

app.post('/api/resend-verification', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.json({ success: false, message: 'Email is required' });
    }

    const supabase = getSupabaseAuthClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getAppBaseUrl(req)}/verify-email.html`
      }
    });

    if (error) {
      return res.json({ success: false, message: error.message || 'Failed to resend verification email.' });
    }

    res.json({ success: true, message: 'Verification email sent successfully.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.json({ success: false, message: 'Failed to resend verification email.' });
  }
});

app.get('/api/verify-email', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    await ensureAuthSchema();
    const tokenHash = (req.query.token_hash || '').toString().trim();
    const type = (req.query.type || 'signup').toString().trim();

    if (!tokenHash) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (error || !data.user) {
      return res.status(400).json({ success: false, message: error?.message || 'Invalid verification link.' });
    }

    const localUser = await upsertLocalUserFromSupabase(data.user);

    req.session.userId = localUser.id;
    req.session.userName = localUser.name;
    ensureCsrfToken(req);

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed.' });
  }
});

// Submit claim
app.post('/api/submit-claim', requireCsrf, upload.single('proof'), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: 'Please login first' });
    }

    const claim_type = normalizeText(req.body.claim_type, 80);
    const reference = normalizeText(req.body.reference, 120);
    const description = normalizeText(req.body.description, 2000);
    const amount = parseAmount(req.body.amount);
    const proofFile = req.file ? req.file.filename : null;

    if (!claim_type || !amount || !reference || !description) {
      return res.json({ success: false, message: 'Claim type, reference, amount, and description are required' });
    }

    const result = await pool.query(
      'INSERT INTO claims (user_id, claim_type, reference_number, amount, proof_file, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [req.session.userId, claim_type, reference, amount, proofFile, description, 'Submitted']
    );

    res.json({
      success: true,
      message: `Claim submitted successfully! Claim ID: #${result.rows[0].id}`,
      claimId: result.rows[0].id
    });

  } catch (error) {
    console.error('Claim submission error:', error);
    if (error?.message?.includes('Only JPG')) {
      return res.json({ success: false, message: error.message });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.json({ success: false, message: 'File size too large. Maximum size is 5MB.' });
    }
    res.json({ success: false, message: 'Failed to submit claim. Please try again.' });
  }
});

// Get user dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const claims = await pool.query(
      'SELECT id, claim_type, reference_number, amount, status, created_at FROM claims WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );

    const stats = claims.rows.reduce((acc, claim) => {
      const amount = parseFloat(claim.amount || 0);
      acc.total_value += amount;
      acc.active_claims += 1;
      if (claim.status === 'Submitted' || claim.status === 'In Review') {
        acc.pending_claims += 1;
      }
      if (claim.status === 'Approved' || claim.status === 'Refunded') {
        acc.success_count += 1;
      }
      return acc;
    }, {
      total_value: 0,
      active_claims: 0,
      pending_claims: 0,
      success_count: 0
    });

    const success_rate = stats.active_claims > 0
      ? Math.round((stats.success_count / stats.active_claims) * 100)
      : 0;

    res.json({
      user: { name: req.session.userName || 'User' },
      stats: {
        total_value: Number(stats.total_value.toFixed(2)),
        active_claims: stats.active_claims,
        pending_claims: stats.pending_claims,
        success_rate
      },
      claims: claims.rows
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get full claim history for authenticated user
app.get('/api/claims/history', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const claims = await pool.query(
      'SELECT id, claim_type, description, amount, status, created_at FROM claims WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );

    res.json({ claims: claims.rows });

  } catch (error) {
    console.error('Claim history error:', error);
    res.status(500).json({ error: 'Failed to load claim history' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const username = normalizeText(req.body.username, 80);
    const password = req.body.password;

    const admin = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (admin.rows.length === 0) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const validPassword = await verifyPassword(password, admin.rows[0].password);
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    req.session.adminId = admin.rows[0].id;
    req.session.adminUsername = admin.rows[0].username;
    ensureCsrfToken(req);

    res.json({ success: true, message: 'Admin login successful!' });

  } catch (error) {
    console.error('Admin login error:', error);
    res.json({ success: false, message: 'Login failed' });
  }
});

// Get admin dashboard stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_claims,
        COUNT(CASE WHEN status IN ('Submitted', 'In Review') THEN 1 END) as pending_claims,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_claims,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_claims,
        COUNT(CASE WHEN status = 'Refunded' THEN 1 END) as refunded_claims,
        COALESCE(SUM(amount), 0) as total_value
      FROM claims
    `);

    const users = await pool.query('SELECT COUNT(*) as total_users FROM users');

    res.json({
      stats: stats.rows[0],
      users: users.rows[0]
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Get all claims for admin
app.get('/api/admin/claims', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { status } = req.query;
    let query = `
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM claims c
      JOIN users u ON c.user_id = u.id
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ' WHERE c.status = $1';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ claims: result.rows });

  } catch (error) {
    console.error('Admin claims error:', error);
    res.status(500).json({ error: 'Failed to load claims' });
  }
});

// Update claim status
app.post('/api/admin/claims/update', requireCsrf, async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.json({ success: false, message: 'Not authenticated' });
    }

    const claimId = Number.parseInt(req.body.claimId, 10);
    const status = normalizeText(req.body.status, 20);
    const notes = normalizeText(req.body.notes, 2000);
    const allowedStatuses = new Set(['Submitted', 'In Review', 'Approved', 'Rejected', 'Refunded']);
    if (!claimId || !allowedStatuses.has(status)) {
      return res.json({ success: false, message: 'Invalid claim update request.' });
    }

    await pool.query('BEGIN');
    const existing = await pool.query('SELECT status FROM claims WHERE id = $1 FOR UPDATE', [claimId]);
    if (existing.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.json({ success: false, message: 'Claim not found.' });
    }

    const oldStatus = existing.rows[0].status;
    await pool.query(
      'UPDATE claims SET status = $1, admin_notes = $2 WHERE id = $3',
      [status, notes || null, claimId]
    );
    await pool.query(
      'INSERT INTO claim_history (claim_id, old_status, new_status, changed_by, notes) VALUES ($1, $2, $3, $4, $5)',
      [claimId, oldStatus, status, req.session.adminId, notes || null]
    );
    await pool.query('COMMIT');

    res.json({ success: true, message: 'Claim updated successfully' });

  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Claim update rollback error:', rollbackError);
    }
    console.error('Update claim error:', error);
    res.json({ success: false, message: 'Failed to update claim' });
  }
});

// Contact Form
app.post('/api/contact', requireCsrf, async (req, res) => {
  try {
    const firstName = normalizeText(req.body.firstName, 80);
    const lastName = normalizeText(req.body.lastName, 80);
    const email = normalizeEmail(req.body.email);
    const subject = normalizeText(req.body.subject, 150);
    const message = normalizeText(req.body.message, 3000);

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.json({ success: false, message: 'All fields are required.' });
    }

    // In a real app, you would send an email here using SendGrid/SMTP
    // For now, we'll log it and return success
    console.log('Contact Form Submission:', { firstName, lastName, email, subject, message });

    // Optional: Store in DB if you want to keep records
    // await pool.query('INSERT INTO messages ...');

    res.json({ success: true, message: 'Message sent successfully!' });

  } catch (error) {
    console.error('Contact error:', error);
    res.json({ success: false, message: 'Failed to send message' });
  }
});

// Get User Profile
app.get('/api/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query('SELECT name, email, phone FROM users WHERE id = $1', [req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update User Profile
app.post('/api/profile/update', requireCsrf, async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const name = normalizeText(req.body.name, 100);
    const phone = normalizeText(req.body.phone, 30);
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    await pool.query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.session.userId]);

    // Update session info if needed
    req.session.userName = name;

    res.json({ success: true, message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Profile update error:', error);
    res.json({ success: false, message: 'Failed to update profile' });
  }
});

// Change Password
app.post('/api/change-password', requireCsrf, async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return res.json({ success: false, message: passwordError });
    }

    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];
    if (!user?.email) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const supabase = getSupabaseAuthClient();
    const signInResult = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInResult.error || !signInResult.data.session) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }

    const scopedSupabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${signInResult.data.session.access_token}`
        }
      }
    });
    const updateResult = await scopedSupabaseClient.auth.updateUser({ password: newPassword });
    if (updateResult.error) {
      return res.json({ success: false, message: updateResult.error.message || 'Failed to update password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.session.userId]);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.json({ success: false, message: 'Failed to change password' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const supabase = getSupabaseAuthClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppBaseUrl(req)}/reset-password.html`
    });

    if (error) {
      return res.json({ success: false, message: error.message || 'Unable to send reset email.' });
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.json({ success: false, message: 'Failed to start password reset.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    if (!hasSupabaseAuthConfig) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.'
      });
    }

    const accessToken = normalizeText(req.body.accessToken, 5000);
    const refreshToken = normalizeText(req.body.refreshToken, 5000);
    const newPassword = req.body.newPassword;
    const passwordError = validatePasswordStrength(newPassword);
    if (!accessToken || !refreshToken || passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError || 'Invalid or expired reset session. Please request a new reset link.'
      });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const sessionResult = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionResult.error || !sessionResult.data.session) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.'
      });
    }

    const updateResult = await supabase.auth.updateUser({ password: newPassword });
    if (updateResult.error) {
      return res.status(400).json({ success: false, message: updateResult.error.message || 'Failed to reset password.' });
    }

    const supabaseUser = updateResult.data.user || sessionResult.data.user;
    if (supabaseUser) {
      const localUser = await upsertLocalUserFromSupabase(supabaseUser);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, localUser.id]);
      req.session.userId = localUser.id;
      req.session.userName = localUser.name;
      ensureCsrfToken(req);
    }

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

// Logout
app.post('/api/logout', requireCsrf, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ success: false, message: 'Invalid file upload.' });
  }

  if (err?.message?.includes('Only JPG, PNG, GIF, and PDF files are allowed.')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return next(err);
});

// Start server
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 RefundHelp server running on http://localhost:${PORT}`);
    console.log(`📊 Database: Supabase PostgreSQL`);
    console.log(`🎨 Demo: http://localhost:${PORT}/demo.html`);
    console.log(`🏠 Home: http://localhost:${PORT}/`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin/login.html`);
  });
}

module.exports = app;