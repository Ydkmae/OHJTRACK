require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedStores = new Set([
  'users', 'documents', 'dtr', 'announcements', 'notifications',
  'weeklyReports', 'letters', 'auditLog', 'institution'
]);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json({ limit: '12mb' }));

function validStore(req, res, next){
  if(!allowedStores.has(req.params.store)){
    return res.status(404).json({ error: 'Unknown data collection.' });
  }
  next();
}

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) { next(error); }
});

const simpleStores = {
  documents: { table: 'documents', id: 'id', data: 'data', orderBy: 'submitted_at' },
  dtr: { table: 'daily_time_records', id: 'id', data: 'data' },
  announcements: { table: 'announcements', id: 'id', data: 'data' },
  notifications: { table: 'notifications', id: 'id', data: 'data' },
  weeklyReports: { table: 'weekly_reports', id: 'id', data: 'data', orderBy: 'submitted_at' },
  letters: { table: 'letters', id: 'id', data: 'data', orderBy: 'submitted_at' },
  auditLog: { table: 'audit_logs', id: 'id', data: 'data' }
};

async function legacyValue(store){
  const result = await pool.query('SELECT value FROM app_storage WHERE store_key = $1', [store]);
  return result.rows[0] ? result.rows[0].value : null;
}

async function readUsers(){
  const result = await pool.query(`SELECT u.id, u.role, u.name, u.email, u.password, u.status,
    u.department, u.theme, u.photo, u.created_at AS "createdAt", p.student_id AS "studentId",
    p.campus, p.program, p.block, p.company, p.supervisor, p.coordinator_id AS "coordinatorId",
    p.required_hours AS "requiredHours", p.active, p.archived
    FROM users u LEFT JOIN trainee_profiles p ON p.user_id = u.id ORDER BY u.created_at, u.id`);
  return result.rows;
}

async function saveUsers(users){
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for(const user of users){
      await client.query(`INSERT INTO users (id, role, name, email, password, status, department, theme, photo, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, name=EXCLUDED.name, email=EXCLUDED.email,
        password=EXCLUDED.password, status=EXCLUDED.status, department=EXCLUDED.department, theme=EXCLUDED.theme,
        photo=EXCLUDED.photo, updated_at=NOW()`, [user.id, user.role, user.name, user.email, user.password,
        user.status || 'pending', user.department || null, user.theme || 'light', user.photo || null, user.createdAt || new Date().toISOString().slice(0,10)]);
      if(user.role === 'trainee'){
        await client.query(`INSERT INTO trainee_profiles (user_id, student_id, campus, program, block, company, supervisor, coordinator_id, required_hours, active, archived)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (user_id) DO UPDATE SET student_id=EXCLUDED.student_id, campus=EXCLUDED.campus,
          program=EXCLUDED.program, block=EXCLUDED.block, company=EXCLUDED.company, supervisor=EXCLUDED.supervisor,
          coordinator_id=EXCLUDED.coordinator_id, required_hours=EXCLUDED.required_hours, active=EXCLUDED.active, archived=EXCLUDED.archived`,
          [user.id, user.studentId || null, user.campus || null, user.program || null, user.block || null,
          user.company || null, user.supervisor || null, user.coordinatorId || null, user.requiredHours || 486,
          user.active !== false, user.archived === true]);
      }
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function readStore(store){
  if(store === 'users') return readUsers();
  if(store === 'institution'){
    const result = await pool.query('SELECT data FROM institution_settings WHERE id = 1');
    return result.rows[0] ? result.rows[0].data : null;
  }
  const config = simpleStores[store];
  const result = await pool.query(`SELECT data FROM ${config.table} ORDER BY ${config.orderBy || 'created_at'} DESC`);
  return result.rows.map(row => row.data);
}

async function saveStore(store, value){
  if(store === 'users') return saveUsers(value);
  if(store === 'institution'){
    await pool.query(`INSERT INTO institution_settings (id, data) VALUES (1, $1::jsonb)
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`, [JSON.stringify(value)]);
    return;
  }
  const config = simpleStores[store];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for(const item of value){
      await client.query(`INSERT INTO ${config.table} (id, data) VALUES ($1, $2::jsonb)
        ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`, [item.id, JSON.stringify(item)]);
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

app.get('/api/storage/:store', validStore, async (req, res, next) => {
  try {
    const value = await readStore(req.params.store);
    // Existing JSON storage remains a one-time fallback until each collection is saved.
    if((Array.isArray(value) && value.length === 0) || value === null){
      return res.json({ value: await legacyValue(req.params.store) });
    }
    res.json({ value });
  } catch (error) { next(error); }
});

app.put('/api/storage/:store', validStore, async (req, res, next) => {
  try {
    if(!Object.prototype.hasOwnProperty.call(req.body, 'value')) return res.status(400).json({ error: 'A value is required.' });
    await saveStore(req.params.store, req.body.value);
    res.json({ saved: true, updatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'The server could not complete the request.' });
});

app.listen(port, () => console.log(`OHJTrack is running at http://localhost:${port}`));
