# PharmaTrack

**AI-Enabled Web-Based Pharmacy Sales & Inventory System with Smart Restocking Predictions**

PharmaTrack is a full-stack pharmacy management system built to replace manual, logbook-based inventory tracking with a centralized, real-time digital platform. It was developed as a capstone project for **Uno Pharmacy**, a small local pharmacy that previously relied entirely on paper logbooks to track stock, sales, and expiration dates — leading to frequent stockouts, overstocking, expired medicine, and inaccurate sales records.

The system was evaluated by 10 IT experts and actual pharmacy staff against **ISO/IEC 27001:2025** software quality standards, scoring **4.37/5** and **4.42/5** overall ("Very Good"), with Functional Suitability rated **"Excellent" (4.53/5)**.

---

## How It Works

### 1. Authentication & Roles
Users log in through a secure authentication system that assigns role-based access — **Admin** or **Pharmacist** — so each user only sees the features relevant to their responsibilities (e.g. pharmacists can process sales and view stock, while admins manage users, suppliers, and system settings).

### 2. Dashboard
On login, users land on a central dashboard summarizing the pharmacy's current state at a glance: total products, low-stock counts, total sales, items flagged for AI restocking, and quick-access charts for stock levels and top-selling products.

### 3. Inventory Management
Staff can add, edit, and track medicines with full detail — name, category, quantity, price, expiration date, product image, and reorder thresholds. Every stock-in and stock-out transaction updates the database in real time, so the displayed quantity is always accurate.

### 4. Sales Processing
When a sale is recorded, PharmaTrack automatically deducts the sold quantity from inventory, stores the full transaction (customer, product, quantity, price, date), and makes it instantly available for reporting — no manual reconciliation needed.

### 5. Expiration & Low-Stock Alerts
The system continuously checks expiration dates and stock levels against configurable thresholds. When a product is expiring soon or running low, an alert appears on the dashboard so staff can act before it becomes a problem (wasted stock or a missed sale).

### 6. Smart Restocking Predictions (AI/ML)
A Python/R forecasting service (using **Prophet time-series forecasting**) analyzes historical sales data to detect trends and seasonality per product. It predicts future demand and stock depletion, then recommends **when** to reorder and **how much** — reducing the risk of both stockouts and overstocking. Forecasts are exposed to the Node.js backend via a script bridge and rendered as charts (current vs. predicted stock, top-selling products over time).

### 7. PharmaPal — AI Inventory Assistant
An integrated conversational assistant (powered by an LLM via OpenRouter) lets staff ask natural-language questions like *"what's running low?"* or *"forecast Ibuprofen for next week"* and get answers pulled directly from live inventory and sales data — no need to dig through menus.

### 8. Supplier Management
Supplier profiles (contact info, category, products supplied) are stored centrally. When a product needs reordering, admins can trigger an automated reorder email (via Nodemailer) directly to the supplier from within the system.

### 9. Sales & Inventory Reporting
Reports can be filtered by day, week, or month, showing transaction counts, revenue, top products, and inventory turnover — exportable to CSV for record-keeping or accounting.

### 10. Account & Security Settings
Users can update their profile, change passwords, and manage sessions. Passwords are hashed with bcrypt, and role-based access control limits what each account can view or modify.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Forecasting / AI | Python, R (Prophet time-series model) |
| AI Assistant | LLM via OpenRouter API |
| Email | Nodemailer |
| Auth | bcrypt password hashing, session-based role access |
| Tools | Visual Studio Code, MySQL Workbench, Git/GitHub |

---

## Key Modules

- **User Management** — role-based accounts (Admin / Pharmacist)
- **Inventory Management** — stock-in/out, expiration tracking, product images
- **Sales Management** — transaction processing with auto inventory deduction
- **Smart Restocking Predictions** — AI-driven forecast of restock timing & quantity
- **PharmaPal AI Assistant** — natural-language inventory Q&A
- **Supplier Management** — supplier records + automated reorder emails
- **Sales & Inventory Reports** — daily/weekly/monthly analytics with CSV export
- **Dashboard & Analytics** — real-time stock, sales, and alert overview

---

## Development Methodology

Built using **Agile development** — iterative sprints covering planning, development, alpha testing (internal), and beta testing (real-world testing with actual Uno Pharmacy staff) — followed by a phased rollout with staff training and post-deployment monitoring.

---

## Evaluation Results

| Evaluator | Overall Score | Rating |
|---|---|---|
| IT Experts (n=10) | 4.37 / 5.00 | Very Good |
| Actual Users — Uno Pharmacy (n=2) | 4.42 / 5.00 | Very Good |

Evaluated against ISO/IEC 27001:2025 criteria: Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, and Portability.

---

## Limitations

- Requires a stable internet/local server connection to operate (no offline mode)
- Designed for desktop browser use; no dedicated mobile app
- Built for single-pharmacy use; does not yet support multi-branch operations
- Record accuracy depends on correct data entry by authorized users

---

## Project Team

Capstone project by **Michael Angelo P. Galvo**, **Bryan Lyndon A. Janda**, and **Charlie B. Rosquites** — BSIT, Pamantasan ng Lungsod ng Muntinlupa (2026), developed in partnership with Uno Pharmacy.
