const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://sidwala:sidwala_secret_2024@localhost:5432/sidwala',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

async function initDb() {
  const client = await pool.connect();
  try {
    // Wait for tables to be ready (init.sql runs via Docker entrypoint)
    let retries = 10;
    while (retries > 0) {
      try {
        await client.query('SELECT 1 FROM users LIMIT 1');
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw new Error('Database tables not ready after multiple retries');
        console.log('Waiting for database tables... retrying in 2s');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Seed admin user if not exists
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', [
      process.env.ADMIN_USERNAME || 'admin'
    ]);

    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
      await client.query(
        `INSERT INTO users (username, display_name, password_hash, avatar_emoji, is_admin)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [
          process.env.ADMIN_USERNAME || 'admin',
          process.env.ADMIN_DISPLAY_NAME || 'Admin',
          hash,
          '👑'
        ]
      );
      console.log('✅ Default admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
