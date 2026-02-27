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
    // Migrate: add is_approved column for existing deployments (approved by default)
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE
    `);

    // Migrate: create notes table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`);

    // Migrate: create messages table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);

    // Migrate: create note_shares table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS note_shares (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        shared_with INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        can_edit BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(note_id, shared_with)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_shares_note ON note_shares(note_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_note_shares_user ON note_shares(shared_with)`);

    // Migrate: add note_id to messages for note-sharing notifications
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL
    `);

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
        `INSERT INTO users (username, display_name, password_hash, avatar_emoji, is_admin, is_approved)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)`,
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
