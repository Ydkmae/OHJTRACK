require('dotenv').config();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const stores = {
  documents: 'documents', dtr: 'daily_time_records', announcements: 'announcements',
  notifications: 'notifications', weeklyReports: 'weekly_reports', letters: 'letters', auditLog: 'audit_logs'
};

async function legacy(store){
  const result = await pool.query('SELECT value FROM app_storage WHERE store_key = $1', [store]);
  return result.rows[0] ? result.rows[0].value : null;
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for(const user of await legacy('users') || []){
      await client.query(`INSERT INTO users (id, role, name, email, password, status, department, theme, photo, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [user.id, user.role, user.name, user.email, user.password, user.status || 'pending', user.department || null,
          user.theme || 'light', user.photo || null, user.createdAt || new Date().toISOString().slice(0, 10)]);
      if(user.role === 'trainee') await client.query(`INSERT INTO trainee_profiles
        (user_id, student_id, campus, program, block, company, supervisor, coordinator_id, required_hours, official_hours, active, archived)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (user_id) DO NOTHING`,
        [user.id, user.studentId || null, user.campus || null, user.program || null, user.block || null, user.company || null,
          user.supervisor || null, user.coordinatorId || null, user.requiredHours || 486, user.officialHours || null,
          user.active !== false, user.archived === true]);
    }
    for(const [store, table] of Object.entries(stores)){
      for(const item of await legacy(store) || []){
        await client.query(`INSERT INTO ${table} (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`, [item.id, JSON.stringify(item)]);
      }
    }
    const institution = await legacy('institution');
    if(institution) await client.query('INSERT INTO institution_settings (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(institution)]);
    await client.query('COMMIT');
    console.log('Legacy app_storage data copied to dedicated tables.');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
