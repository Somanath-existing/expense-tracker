const path = require('path');

// ─── Detect database mode ────────────────────────────
// If DATABASE_URL env var is set → PostgreSQL (production)
// Otherwise → SQLite file (local development)
const IS_PG = !!process.env.DATABASE_URL;

let pool, sqlite;

if (IS_PG) {
  const { Pool, types } = require('pg');
  // Keep DATE and TIMESTAMP values as plain strings (matches SQLite behaviour)
  types.setTypeParser(1082, v => v);              // DATE
  types.setTypeParser(1114, v => v);              // TIMESTAMP
  types.setTypeParser(1184, v => v);              // TIMESTAMPTZ
  types.setTypeParser(1700, v => parseFloat(v));  // NUMERIC → number

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });
} else {
  // Dynamic require prevents Vercel's bundler from trying to bundle
  // the native better-sqlite3 module (which fails on serverless)
  const sqliteModuleName = 'better-sqlite3';
  const Database = require(sqliteModuleName);
  sqlite = new Database(path.join(__dirname, 'expenses.db'));
  sqlite.pragma('journal_mode = WAL');
}

// ─── Schema initialisation ──────────────────────────
async function initializeDb() {
  if (IS_PG) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
        date DATE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('Food','Transport','Shopping','Bills','Entertainment','Other')),
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)');
    console.log('  📦 Connected to PostgreSQL');
  } else {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        date TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('Food','Transport','Shopping','Bills','Entertainment','Other')),
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC)');
    sqlite.exec('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)');
    console.log('  📦 Using local SQLite database');
  }
}

// ─── getAllExpenses ──────────────────────────────────
async function getAllExpenses(filters = {}) {
  if (IS_PG) {
    let q = 'SELECT * FROM expenses WHERE 1=1';
    const vals = [];
    let i = 1;
    if (filters.category) { q += ` AND category = $${i++}`; vals.push(filters.category); }
    if (filters.from)     { q += ` AND date >= $${i++}`;     vals.push(filters.from); }
    if (filters.to)       { q += ` AND date <= $${i++}`;     vals.push(filters.to); }
    if (filters.search)   { q += ` AND title ILIKE $${i++}`; vals.push(`%${filters.search}%`); }
    q += ' ORDER BY date DESC, created_at DESC';
    const { rows } = await pool.query(q, vals);
    return rows;
  }

  // SQLite
  let q = 'SELECT * FROM expenses WHERE 1=1';
  const p = {};
  if (filters.category) { q += ' AND category = @category'; p.category = filters.category; }
  if (filters.from)     { q += ' AND date >= @from';        p.from = filters.from; }
  if (filters.to)       { q += ' AND date <= @to';          p.to = filters.to; }
  if (filters.search)   { q += ' AND title LIKE @search';   p.search = `%${filters.search}%`; }
  q += ' ORDER BY date DESC, created_at DESC';
  return sqlite.prepare(q).all(p);
}

// ─── getExpenseById ─────────────────────────────────
async function getExpenseById(id) {
  if (IS_PG) {
    const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    return rows[0] || null;
  }
  return sqlite.prepare('SELECT * FROM expenses WHERE id = ?').get(id) || null;
}

// ─── createExpense ──────────────────────────────────
async function createExpense({ title, amount, date, category, note }) {
  if (IS_PG) {
    const { rows } = await pool.query(
      'INSERT INTO expenses (title, amount, date, category, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, amount, date, category, note || '']
    );
    return rows[0];
  }
  const result = sqlite.prepare(
    'INSERT INTO expenses (title, amount, date, category, note) VALUES (?, ?, ?, ?, ?)'
  ).run(title, amount, date, category, note || '');
  return sqlite.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
}

// ─── updateExpense ──────────────────────────────────
async function updateExpense(id, { title, amount, date, category, note }) {
  if (IS_PG) {
    const { rows } = await pool.query(
      `UPDATE expenses SET title=$1, amount=$2, date=$3, category=$4, note=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [title, amount, date, category, note || '', id]
    );
    return rows[0];
  }
  sqlite.prepare(
    `UPDATE expenses SET title=?, amount=?, date=?, category=?, note=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(title, amount, date, category, note || '', id);
  return sqlite.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
}

// ─── deleteExpense ──────────────────────────────────
async function deleteExpense(id) {
  if (IS_PG) {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    return;
  }
  sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

// ─── getMonthlySummary ──────────────────────────────
async function getMonthlySummary(yearMonth) {
  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  if (IS_PG) {
    const totalRes = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= $1 AND date <= $2',
      [startDate, endDate]
    );
    const catRes = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*)::int as count
       FROM expenses WHERE date >= $1 AND date <= $2
       GROUP BY category ORDER BY total DESC`,
      [startDate, endDate]
    );
    return {
      month: yearMonth,
      total: parseFloat(totalRes.rows[0].total),
      byCategory: catRes.rows.map(r => ({ ...r, total: parseFloat(r.total) })),
    };
  }

  // SQLite
  const total = sqlite.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?'
  ).get(startDate, endDate);
  const byCategory = sqlite.prepare(
    `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
     FROM expenses WHERE date >= ? AND date <= ?
     GROUP BY category ORDER BY total DESC`
  ).all(startDate, endDate);
  return { month: yearMonth, total: total.total, byCategory };
}

module.exports = { initializeDb, getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getMonthlySummary };
