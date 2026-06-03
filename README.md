# ExpenseFlow — Personal Expense Tracker

A beautiful, responsive, and lightweight personal expense tracker web application built as part of a Software Engineer Practical Test.

---

## 🚀 How to Run Locally

### 1. Prerequisites
Ensure you have **Node.js** (v16 or higher recommended) and **npm** installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
```bash
npm run dev
```
Or:
```bash
npm start
```

### 4. Access the Application
Open **[http://localhost:3000](http://localhost:3000)**

> **Note:** When running locally without a `DATABASE_URL` environment variable, the app automatically uses a **local SQLite** file (`expenses.db`) — no database setup needed.

---

## ☁️ Free Cloud Deployment Guide

Deploy this app for **$0** with **instant, zero-sleep response times** using **Vercel** (hosting) + **Supabase** (free PostgreSQL).

### Step 1 — Get a Free PostgreSQL Database on Supabase

1. Go to **[supabase.com](https://supabase.com)** and sign up (free, no credit card).
2. Click **"New Project"** → name it `expenseflow` and set a database password.
3. Once the project is created, navigate to **Project Settings → Database** from the sidebar.
4. Scroll down to the **Connection string** section, select the **URI** tab, and copy the connection string. It will look like:
   ```
   postgresql://postgres.[your-project-id]:[your-password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[your-password]` with the password you set during project creation, and save this URL.

### Step 2 — Push the Code to GitHub

Commit the changes (including `vercel.json` and the serverless-ready `server.js`) and push to GitHub:
```bash
git add .
git commit -m "Configure Vercel serverless deployment"
git push origin main
```

### Step 3 — Deploy to Vercel (Free)

1. Go to **[vercel.com](https://vercel.com)** and sign up or sign in using your GitHub account.
2. Click **"Add New" → "Project"**.
3. Import your `expense-tracker` repository.
4. Under the **Configure Project** panel:
   * Vercel will automatically configure the routing using the `vercel.json` file in the repo.
   * Expand **Environment Variables** and add:
     * **Name**: `DATABASE_URL`
     * **Value**: *(paste the connection string from Step 1)*
5. Click **"Deploy"**.
6. Within a minute, your app will be live with a permanent, secure, and always-on URL (e.g., `https://expense-tracker-nine.vercel.app`)! 🎉

---

---

## 🛠️ Stack Choices & Tradeoffs

*   **Backend**: Node.js with **Express**
    *   *Tradeoff*: Express is lightweight, easy to set up, and has minimal overhead. It allows building a clean REST API in a single file (`server.js`) without the boilerplates of larger frameworks like NestJS or Koa, saving time and keeping the codebase easy to audit.
*   **Database**: **Hybrid — SQLite (local) / PostgreSQL (production)**
    *   The app auto-detects: if a `DATABASE_URL` env var is set, it connects to PostgreSQL. Otherwise, it uses a local SQLite file.
    *   *SQLite tradeoff*: Zero-setup for local reviewers — no database server to install.
    *   *PostgreSQL tradeoff*: Production-grade, with full concurrency, ACID compliance, and cloud-native integration.
    *   All database logic is abstracted in `database.js`, making the backend agnostic to which engine is running.
*   **Frontend**: Semantic HTML5, Vanilla JavaScript, and Custom CSS (Modern CSS variables, Flexbox/Grid, and glassmorphic designs)
    *   *Tradeoff*: No React, Vue, or TailwindCSS compiler is needed. This results in instant page load, zero build steps, and ensures the code runs directly in any browser out of the box.

---

## ✅ What's Done

All core and extended requirements have been fully implemented:
1.  **Add Expense**: Add title, amount (local currency: ₹), date (defaults to today), category (Food, Transport, Shopping, Bills, Entertainment, Other), and optional note.
2.  **View List**: View all expenses sorted by date (most recent first) showing all details.
3.  **Edit / Delete**: Inline options to edit details or delete an expense (with a confirmation modal).
4.  **Monthly Summary**: Interactive monthly summary showing total spent and category-wise breakdown for the selected month, complete with a dynamic SVG Donut Chart.
5.  **Filters**: Real-time filters for search/title (partial match), category, and date range (from/to) with a "Clear Filters" utility.
6.  **UX Polish**: Modern UI with a glassmorphism theme, CSS transitions, entry animations, input validation, and Toast alerts for user actions.
7.  **Deployment-Ready**: Hybrid database with free cloud deployment support (Render + Neon PostgreSQL).

---

## 🧱 Data Model

The schema is auto-created on startup. Here is the PostgreSQL version (SQLite version is equivalent):

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Food','Transport','Shopping','Bills','Entertainment','Other')),
  note TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛡️ Edge Cases Handled

*   **Invalid Date Ranges**: If the user filters using a "From" date that is later than the "To" date, the API returns a clear error (`"From" date must be before or equal to "To" date`) and blocks the query.
*   **Empty States**: Clear illustration and messaging when no expenses exist or when filters yield no matches.
*   **Form Validations**: Built-in backend and frontend validation prevents negative amounts, empty titles, invalid categories, or invalid date formats.
*   **XSS Mitigation**: String values render in the HTML using an `escapeHtml` helper.
*   **Large Inputs**: Limits are enforced for amount scale (max 99,999,999.99), title length (max 200 chars), and note length (max 1000 chars).
*   **Database Resilience**: Graceful error handling on all API routes with proper HTTP status codes (400, 404, 500).
