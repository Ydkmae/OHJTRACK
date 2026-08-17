require('dotenv').config();

const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;
if(!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD){
  console.error('Set DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD in .env before creating an administrator.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

(async () => {
  try {
    const result = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if(result.rows.length){
      throw new Error('An administrator account already exists.');
    }
    await pool.query(
      `INSERT INTO users (id, role, name, email, password, status, theme, created_at)
       VALUES ($1, 'admin', $2, $3, $4, 'approved', 'light', CURRENT_DATE)`,
      [`u_${randomUUID()}`, ADMIN_NAME || 'System Administrator', ADMIN_EMAIL.trim().toLowerCase(), ADMIN_PASSWORD]
    );
    console.log(`Administrator account created for ${ADMIN_EMAIL}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
