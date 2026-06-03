/* ======================================================
   ExpenseFlow — Frontend Application Logic
   ====================================================== */

// ─── State ───────────────────────────────────────────
const state = {
  expenses: [],
  editingId: null,
  deleteId: null,
  currentMonth: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })(),
  filters: { search: '', category: '', from: '', to: '' },
  debounceTimer: null,
};

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];
const CAT_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '📄', Entertainment: '🎬', Other: '📦' };
const CAT_COLORS = {
  Food: '#ff6b6b', Transport: '#4ecdc4', Shopping: '#feca57',
  Bills: '#a29bfe', Entertainment: '#fd79a8', Other: '#636e72',
};

// ─── DOM Refs ────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  addBtn: $('#addExpenseBtn'),
  prevMonth: $('#prevMonth'),
  nextMonth: $('#nextMonth'),
  currentMonth: $('#currentMonth'),
  totalAmount: $('#totalAmount'),
  donutChart: $('#donutChart'),
  chartCenter: $('#chartCenter'),
  chartCenterCount: $('#chartCenterCount'),
  chartEmpty: $('#chartEmpty'),
  categoryBreakdown: $('#categoryBreakdown'),
  searchInput: $('#searchInput'),
  categoryFilter: $('#categoryFilter'),
  dateFrom: $('#dateFrom'),
  dateTo: $('#dateTo'),
  clearFilters: $('#clearFilters'),
  expensesList: $('#expensesList'),
  emptyState: $('#emptyState'),
  emptyTitle: $('#emptyTitle'),
  emptySubtitle: $('#emptySubtitle'),
  // Modal
  expenseModal: $('#expenseModal'),
  modalTitle: $('#modalTitle'),
  modalClose: $('#modalClose'),
  expenseForm: $('#expenseForm'),
  titleInput: $('#titleInput'),
  amountInput: $('#amountInput'),
  dateInput: $('#dateInput'),
  noteInput: $('#noteInput'),
  cancelBtn: $('#cancelBtn'),
  submitBtn: $('#submitBtn'),
  submitBtnText: $('#submitBtnText'),
  // Errors
  titleError: $('#titleError'),
  amountError: $('#amountError'),
  dateError: $('#dateError'),
  categoryError: $('#categoryError'),
  // Delete
  deleteModal: $('#deleteModal'),
  cancelDelete: $('#cancelDelete'),
  confirmDelete: $('#confirmDelete'),
  // Toast
  toastContainer: $('#toastContainer'),
};

// ─── API Helpers ─────────────────────────────────────
async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.errors ? data.errors.join(', ') : data.error || 'Request failed');
    throw new Error(errorMsg);
  }
  return data;
}

async function fetchExpenses() {
  const params = new URLSearchParams();
  if (state.filters.search) params.set('search', state.filters.search);
  if (state.filters.category) params.set('category', state.filters.category);
  if (state.filters.from) params.set('from', state.filters.from);
  if (state.filters.to) params.set('to', state.filters.to);
  const qs = params.toString();
  state.expenses = await api(`/api/expenses${qs ? '?' + qs : ''}`);
  renderExpenses();
}

async function fetchSummary() {
  const summary = await api(`/api/expenses/summary?month=${state.currentMonth}`);
  renderSummary(summary);
}

// ─── Render: Expenses List ───────────────────────────
function renderExpenses() {
  const list = els.expensesList;
  const empty = els.emptyState;

  if (!state.expenses.length) {
    list.innerHTML = '';
    const hasFilters = state.filters.search || state.filters.category || state.filters.from || state.filters.to;
    els.emptyTitle.textContent = hasFilters ? 'No matches found' : 'No expenses yet';
    els.emptySubtitle.textContent = hasFilters
      ? 'Try adjusting your filters.'
      : 'Click "Add Expense" to start tracking your spending.';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.expenses.map((e, i) => `
    <div class="expense-card" data-id="${e.id}" style="animation-delay: ${i * 0.04}s">
      <div class="expense-cat-badge badge-${e.category.toLowerCase()}">${CAT_EMOJI[e.category] || '📦'}</div>
      <div class="expense-info">
        <div class="expense-title" title="${escapeHtml(e.title)}">${escapeHtml(e.title)}</div>
        <div class="expense-meta">
          <span>${formatDate(e.date)}</span>
          <span class="dot"></span>
          <span style="color:${CAT_COLORS[e.category]}">${e.category}</span>
        </div>
        ${e.note ? `<div class="expense-note" title="${escapeHtml(e.note)}">${escapeHtml(e.note)}</div>` : ''}
      </div>
      <div class="expense-amount">₹${formatNumber(e.amount)}</div>
      <div class="expense-actions">
        <button class="action-btn edit" title="Edit" onclick="editExpense(${e.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" title="Delete" onclick="promptDelete(${e.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Render: Summary ─────────────────────────────────
function renderSummary(summary) {
  // Month label
  const [y, m] = state.currentMonth.split('-');
  const monthName = new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  els.currentMonth.textContent = monthName;

  // Total
  els.totalAmount.textContent = `₹${formatNumber(summary.total)}`;

  // Count
  const totalCount = summary.byCategory.reduce((s, c) => s + c.count, 0);

  // Chart
  if (summary.total === 0) {
    els.donutChart.innerHTML = '';
    els.chartCenter.style.display = 'none';
    els.chartEmpty.style.display = 'flex';
  } else {
    els.chartEmpty.style.display = 'none';
    els.chartCenter.style.display = 'flex';
    els.chartCenterCount.textContent = totalCount;
    renderDonut(summary);
  }

  // Category breakdown
  if (summary.byCategory.length === 0) {
    els.categoryBreakdown.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:0.5rem;">No data for this month</p>';
  } else {
    els.categoryBreakdown.innerHTML = summary.byCategory.map(c => `
      <div class="cat-row">
        <div class="cat-dot" style="background:${CAT_COLORS[c.category]}"></div>
        <span class="cat-name">${c.category}</span>
        <span class="cat-amount">₹${formatNumber(c.total)}</span>
        <span class="cat-count">(${c.count})</span>
      </div>
    `).join('');
  }
}

function renderDonut(summary) {
  const svg = els.donutChart;
  const cx = 100, cy = 100, r = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = summary.byCategory.map(c => {
    const pct = summary.total > 0 ? c.total / summary.total : 0;
    const dashLen = pct * circumference;
    const seg = { category: c.category, dashLen, offset, color: CAT_COLORS[c.category] };
    offset += dashLen;
    return seg;
  });

  svg.innerHTML = segments.map(s => `
    <circle class="donut-segment"
      cx="${cx}" cy="${cy}" r="${r}"
      stroke="${s.color}"
      stroke-dasharray="${s.dashLen} ${circumference - s.dashLen}"
      stroke-dashoffset="${-s.offset + s.dashLen}"
      style="transition-delay: ${segments.indexOf(s) * 0.1}s"
    />
  `).join('');
}

// ─── Modal: Open / Close ─────────────────────────────
function openModal(expense = null) {
  clearFormErrors();
  if (expense) {
    state.editingId = expense.id;
    els.modalTitle.textContent = 'Edit Expense';
    els.submitBtnText.textContent = 'Update Expense';
    els.titleInput.value = expense.title;
    els.amountInput.value = expense.amount;
    els.dateInput.value = expense.date;
    els.noteInput.value = expense.note || '';
    const radio = document.querySelector(`input[name="category"][value="${expense.category}"]`);
    if (radio) radio.checked = true;
  } else {
    state.editingId = null;
    els.modalTitle.textContent = 'Add Expense';
    els.submitBtnText.textContent = 'Save Expense';
    els.expenseForm.reset();
    els.dateInput.value = new Date().toISOString().split('T')[0];
  }
  els.expenseModal.style.display = 'flex';
  setTimeout(() => els.titleInput.focus(), 100);
}

function closeModal() {
  els.expenseModal.style.display = 'none';
  state.editingId = null;
}

// ─── Modal: Submit ───────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const data = {
    title: els.titleInput.value,
    amount: els.amountInput.value,
    date: els.dateInput.value,
    category: document.querySelector('input[name="category"]:checked')?.value || '',
    note: els.noteInput.value,
  };

  // Client-side validation
  let valid = true;
  if (!data.title.trim()) { showFieldError('title', 'Title is required'); valid = false; }
  if (!data.amount || Number(data.amount) <= 0) { showFieldError('amount', 'Enter a valid positive amount'); valid = false; }
  if (!data.date) { showFieldError('date', 'Date is required'); valid = false; }
  if (!data.category) { showFieldError('category', 'Pick a category'); valid = false; }
  if (!valid) return;

  try {
    if (state.editingId) {
      await api(`/api/expenses/${state.editingId}`, { method: 'PUT', body: JSON.stringify(data) });
      toast('Expense updated!', 'success');
    } else {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify(data) });
      toast('Expense added!', 'success');
    }
    closeModal();
    fetchExpenses();
    fetchSummary();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Edit / Delete ───────────────────────────────────
function editExpense(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (expense) openModal(expense);
}

function promptDelete(id) {
  state.deleteId = id;
  els.deleteModal.style.display = 'flex';
}

async function confirmDeleteExpense() {
  if (!state.deleteId) return;
  try {
    await api(`/api/expenses/${state.deleteId}`, { method: 'DELETE' });
    toast('Expense deleted', 'success');
    els.deleteModal.style.display = 'none';
    state.deleteId = null;
    fetchExpenses();
    fetchSummary();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Month Navigation ────────────────────────────────
function changeMonth(dir) {
  let [y, m] = state.currentMonth.split('-').map(Number);
  m += dir;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  state.currentMonth = `${y}-${String(m).padStart(2, '0')}`;
  fetchSummary();
}

// ─── Filters ─────────────────────────────────────────
function applyFilters() {
  state.filters.search = els.searchInput.value.trim();
  state.filters.category = els.categoryFilter.value;
  state.filters.from = els.dateFrom.value;
  state.filters.to = els.dateTo.value;
  fetchExpenses();
}

function debouncedFilter() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(applyFilters, 300);
}

function clearAllFilters() {
  els.searchInput.value = '';
  els.categoryFilter.value = '';
  els.dateFrom.value = '';
  els.dateTo.value = '';
  state.filters = { search: '', category: '', from: '', to: '' };
  fetchExpenses();
}

// ─── Validation Helpers ──────────────────────────────
function showFieldError(field, msg) {
  const errEl = $(`#${field}Error`);
  const inputEl = $(`#${field}Input`);
  if (errEl) errEl.textContent = msg;
  if (inputEl) inputEl.classList.add('error');
}

function clearFormErrors() {
  $$('.field-error').forEach(el => (el.textContent = ''));
  $$('.input.error').forEach(el => el.classList.remove('error'));
}

// ─── Toast ───────────────────────────────────────────
function toast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escapeHtml(message)}</span>`;
  els.toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove());
  }, 3000);
}

// ─── Utilities ───────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Event Binding ───────────────────────────────────
function init() {
  // Add expense
  els.addBtn.addEventListener('click', () => openModal());

  // Form
  els.expenseForm.addEventListener('submit', handleSubmit);
  els.cancelBtn.addEventListener('click', closeModal);
  els.modalClose.addEventListener('click', closeModal);

  // Close modals on overlay click
  els.expenseModal.addEventListener('click', (e) => { if (e.target === els.expenseModal) closeModal(); });
  els.deleteModal.addEventListener('click', (e) => { if (e.target === els.deleteModal) { els.deleteModal.style.display = 'none'; state.deleteId = null; } });

  // Delete confirm
  els.confirmDelete.addEventListener('click', confirmDeleteExpense);
  els.cancelDelete.addEventListener('click', () => { els.deleteModal.style.display = 'none'; state.deleteId = null; });

  // Month nav
  els.prevMonth.addEventListener('click', () => changeMonth(-1));
  els.nextMonth.addEventListener('click', () => changeMonth(1));

  // Filters
  els.searchInput.addEventListener('input', debouncedFilter);
  els.categoryFilter.addEventListener('change', applyFilters);
  els.dateFrom.addEventListener('change', applyFilters);
  els.dateTo.addEventListener('change', applyFilters);
  els.clearFilters.addEventListener('click', clearAllFilters);

  // Keyboard: Escape to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.deleteModal.style.display === 'flex') { els.deleteModal.style.display = 'none'; state.deleteId = null; }
      else if (els.expenseModal.style.display === 'flex') closeModal();
    }
  });

  // Initial load
  fetchExpenses();
  fetchSummary();
}

document.addEventListener('DOMContentLoaded', init);
