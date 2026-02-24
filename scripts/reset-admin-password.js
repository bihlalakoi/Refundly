require('dotenv').config();

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function main() {
  const username = process.argv[2] || 'admin';
  const plainPassword = process.argv[3];

  if (!plainPassword) {
    console.error('Usage: node scripts/reset-admin-password.js <username> <newPassword>');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false') === 'true'
    }
  });

  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    const result = await pool.query(
      'UPDATE admin_users SET password = $1 WHERE username = $2 RETURNING id, username',
      [hash, username]
    );

    if (result.rowCount === 0) {
      console.error(`No admin user found with username: ${username}`);
      process.exit(1);
    }

    console.log(`Admin password updated for ${result.rows[0].username}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Failed to reset admin password:', error.message);
  process.exit(1);
});
