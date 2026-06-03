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

Deploy this app for **$0** using **Render** (hosting) + **Neon** (free PostgreSQL).

### Step 1 — Create a Free PostgreSQL Database on Neon

1. Go to **[neon.tech](https://neon.tech/)** and sign up (free, no credit card).
2. Click **"Create Project"** → give it a name (e.g., `expenseflow`).
3. Once created, copy the **connection string** from the dashboard. It looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this string — you'll paste it into Render in the next step.

### Step 2 — Push Code to GitHub

1. Create a new repository on GitHub (e.g., `expense-tracker`).
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
   git push -u origin main
   ```

### Step 3 — Deploy to Render (Free)

1. Go to **[render.com](https://render.com/)** and sign up (free, no credit card).
2. Click **"New" → "Web Service"**.
3. Connect your GitHub repo (`expense-tracker`).
4. Configure the service:
   | Setting        | Value              |
   | -------------- | ------------------ |
   | **Name**       | `expenseflow`      |
   | **Runtime**    | `Node`             |
   | **Build Cmd**  | `npm install`      |
   | **Start Cmd**  | `node server.js`   |
   | **Plan**       | `Free`             |
5. Under **"Environment"**, add an environment variable:
   | Key             | Value                                        |
   | --------------- | -------------------------------------------- |
   | `DATABASE_URL`  | *(paste the Neon connection string from Step 1)* |
6. Click **"Deploy Web Service"**.
7. Wait ~2 minutes. Render will build the app and give you a live URL like:
   ```
   https://expenseflow.onrender.com
   ```

That's it — your app is live with a real PostgreSQL database! 🎉

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
