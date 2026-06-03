const express = require('express');
const path = require('path');
const { initializeDb, getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getMonthlySummary } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VALID_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];

function validateExpense(data) {
  const errors = [];
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Title is required');
  } else if (data.title.trim().length > 200) {
    errors.push('Title must be 200 characters or less');
  }
  if (data.amount === undefined || data.amount === null || data.amount === '') {
    errors.push('Amount is required');
  } else if (isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Amount must be a positive number');
  } else if (Number(data.amount) > 99999999.99) {
    errors.push('Amount is too large');
  }
  if (!data.date) {
    errors.push('Date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  } else if (isNaN(new Date(data.date + 'T00:00:00').getTime())) {
    errors.push('Invalid date');
  }
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (data.note && typeof data.note === 'string' && data.note.length > 1000) {
    errors.push('Note must be 1000 characters or less');
  }
  return errors;
}

// --- API Routes ---

app.get('/api/expenses', async (req, res) => {
  try {
    const filters = {
      category: req.query.category || null,
      from: req.query.from || null,
      to: req.query.to || null,
      search: req.query.search || null,
    };
    if (filters.from && filters.to && filters.from > filters.to) {
      return res.status(400).json({ error: '"From" date must be before or equal to "To" date' });
    }
    res.json(await getAllExpenses(filters));
  } catch (err) {
    console.error('GET /api/expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.get('/api/expenses/summary', async (req, res) => {
  try {
    const now = new Date();
    const yearMonth = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: 'Month must be in YYYY-MM format' });
    }
    res.json(await getMonthlySummary(yearMonth));
  } catch (err) {
    console.error('GET /api/expenses/summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const errors = validateExpense(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const expense = await createExpense({
      title: req.body.title.trim(),
      amount: Number(Number(req.body.amount).toFixed(2)),
      date: req.body.date,
      category: req.body.category,
      note: (req.body.note || '').trim(),
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('POST /api/expenses error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid expense ID' });
    if (!(await getExpenseById(id))) return res.status(404).json({ error: 'Expense not found' });
    const errors = validateExpense(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const expense = await updateExpense(id, {
      title: req.body.title.trim(),
      amount: Number(Number(req.body.amount).toFixed(2)),
      date: req.body.date,
      category: req.body.category,
      note: (req.body.note || '').trim(),
    });
    res.json(expense);
  } catch (err) {
    console.error('PUT /api/expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid expense ID' });
    if (!(await getExpenseById(id))) return res.status(404).json({ error: 'Expense not found' });
    await deleteExpense(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/expenses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Startup ---
async function start() {
  await initializeDb();
  app.listen(PORT, () => {
    console.log(`\n  🚀 ExpenseFlow running at  http://localhost:${PORT}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
