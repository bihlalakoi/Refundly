require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBcryptHash(hash = '') {
  // Node bcrypt doesn't support $2y$ prefix directly, convert to $2b$.
  return hash.startsWith('$2y$') ? `$2b$${hash.slice(4)}` : hash;
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

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, phone]
    );

    // Log user in
    req.session.userId = result.rows[0].id;
    req.session.userName = name;

    res.json({ success: true, message: 'Account created successfully!' });

  } catch (error) {
    console.error('Registration error:', error);
    res.json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const validPassword = await verifyPassword(password, user.rows[0].password);
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    req.session.userId = user.rows[0].id;
    req.session.userName = user.rows[0].name;

    res.json({ success: true, message: 'Login successful!' });

  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Submit claim
app.post('/api/submit-claim', upload.single('proof'), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: 'Please login first' });
    }

    const { claim_type, reference, amount, description } = req.body;
    const proofFile = req.file ? req.file.filename : null;

    if (!claim_type || !amount) {
      return res.json({ success: false, message: 'Claim type and amount are required' });
    }

    if (parseFloat(amount) <= 0) {
      return res.json({ success: false, message: 'Amount must be greater than 0' });
    }

    const result = await pool.query(
      'INSERT INTO claims (user_id, claim_type, reference_number, amount, proof_file, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [req.session.userId, claim_type, reference, parseFloat(amount), proofFile, description, 'Submitted']
    );

    res.json({
      success: true,
      message: `Claim submitted successfully! Claim ID: #${result.rows[0].id}`,
      claimId: result.rows[0].id
    });

  } catch (error) {
    console.error('Claim submission error:', error);
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
    const { username, password } = req.body;

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
app.post('/api/admin/claims/update', async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.json({ success: false, message: 'Not authenticated' });
    }

    const { claimId, status, notes } = req.body;

    await pool.query(
      'UPDATE claims SET status = $1, admin_notes = $2 WHERE id = $3',
      [status, notes, claimId]
    );

    // Track history (optional but good practice)
    // await pool.query('INSERT INTO claim_history ...');

    res.json({ success: true, message: 'Claim updated successfully' });

  } catch (error) {
    console.error('Update claim error:', error);
    res.json({ success: false, message: 'Failed to update claim' });
  }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

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
app.post('/api/profile/update', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { name, phone } = req.body;

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
app.post('/api/change-password', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];

    // Verify current password
    const validPassword = await verifyPassword(currentPassword, user.password);
    if (!validPassword) {
      return res.json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update DB
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.session.userId]);

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.json({ success: false, message: 'Failed to change password' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RefundHelp server running on http://localhost:${PORT}`);
  console.log(`📊 Database: Supabase PostgreSQL`);
  console.log(`🎨 Demo: http://localhost:${PORT}/demo.html`);
  console.log(`🏠 Home: http://localhost:${PORT}/`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin/login.html`);
});