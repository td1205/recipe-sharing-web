# Recipe Sharing Web

A full-stack web platform for discovering, publishing, and interacting with Vietnamese cooking recipes—featuring a **Multi-Scenario Hybrid Recommendation System** (`Popularity Bayes`, `TF-IDF Content-Based`, `Item-Based Collaborative Filtering`, `Ingredient Matching`) and **AI-Powered Dish Recognition** via Google Gemini.

---

## Key Features

- **Recipe Discovery & Multi-Criteria Filtering:** Browse 1,180+ cleaned Vietnamese recipes (from the ViFoodRec dataset), search with real-time keyword suggestions, and filter by category, meal time (Breakfast, Lunch, Dinner, Vegetarian, Quick $\le 30$ min), tags, cooking time, and ratings with server-side two-phase pagination.
- **Multi-Scenario Hybrid Recommendation Engine (`services/recommender/`):**
  - **Context-Aware Switching & Weighted Hybrid:** Dynamically adapts to user interaction history:
    - *Cold-start / Guest ($n = 0$):* **Bayesian Popularity** ($m = 5$) combining ratings, log-favorites, and log-views.
    - *Light history ($1 \le n \le 2$):* **Domain-Weighted TF-IDF Content-Based Filtering** (`tag` $1.5\times$, `ingredient` $1.0\times$, `category` $1.0\times$, `title word` $0.5\times$) with Vietnamese staple-condiment filtering.
    - *Rich history ($n \ge 3$):* **Weighted Hybrid ($0.3 \times \text{CBF} + 0.7 \times \text{Item-CF}$)** with positive-only similarity and shrinkage ($\lambda = 5$).
    - *Recipe Detail Page:* **Similar Recipes ($0.7 \times \text{CBF} + 0.3 \times \text{CF}$)** with automatic $100\%$ CBF fallback for newly published recipes.
    - *"What's in your fridge?" ($1\text{–}15$ ingredients):* **Knowledge-Based Ingredient Matching** ($0.5 \times \text{coverage} + 0.5 \times \text{utilization}$) excluding common pantry condiments.
  - **Negative Feedback & Category Diversification:** Hard-excludes already-interacted or $1\text{–}2$ star recipes, applies a soft penalty ($-0.35 \cdot S_{\text{content}}^-$) to recipes similar to disliked items, caps each category at 4 items per list, and provides **human-readable explanations** on every recommended card.
  - **In-Memory Snapshot & Non-Blocking Background Rebuild:** Serves recommendations in $< 30\text{ ms}$ from RAM while rebuilding asynchronously in the background (10-minute TTL, 30-second retry cooldown).
- **AI Dish Recognition from Photos:** Upload a food image (`JPEG`, `PNG`, `WEBP`, `GIF` $\le 5\text{ MB}$, verified via Magic Bytes) to identify the dish using Google Gemini Vision with automatic multi-model fallback.
- **Interactive Cooking Mode & Mobile Companion:** Step-by-step interactive cooking checklist, dynamic serving-size ingredient scaling, printable recipe cards, and QR/link sharing to mobile devices.
- **Community Engagement:** Atomic 1–5 star ratings (`ON DUPLICATE KEY UPDATE`), idempotent favorites, comments, user-contributed tags, violation reporting, and 24-hour deduplicated view counting (`viewer_hash` HMAC-SHA256).
- **Administration, Moderation & Observability:** Dashboard analytics with growth charts, user & role management (with serialized transaction protection for the last active administrator), recipe/category/comment moderation, violation report workflow, immutable admin audit logs, recommender model inspector, and `/healthz` + `/readyz` probes.

---

## Screenshots

### 1. Discovery, Filtering & Personalized Recommendations

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Recipe Catalog & Multi-Criteria Filter</strong><br>
      <img src="./public/images/Hinh_5.5.png" alt="Recipe Catalog and Filtering" />
    </td>
    <td align="center" width="50%">
      <strong>Personalized Recommendations ("Dành riêng cho bạn")</strong><br>
      <img src="./public/images/Hinh_5.4.jpg" alt="Personalized Recommendations" />
      <br><br>
      <strong>Filter Bar & Pagination Controls</strong><br>
      <img src="./public/images/Hinh_5.6_a.png" alt="Filter Bar" /><br>
      <img src="./public/images/Hinh_5.6_b.png" alt="Pagination Controls" />
    </td>
  </tr>
</table>

### 2. Recipe Detail, Interactive Cooking & Mobile Companion

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Recipe Detail Page</strong><br>
      <img src="./public/images/Hinh_5.7.png" alt="Recipe Detail Page" />
    </td>
    <td align="center" width="50%">
      <strong>Ratings, Comments & Similar Recipes ("Gợi ý cho bạn")</strong><br>
      <img src="./public/images/Hinh_5.8.png" alt="Ratings, Comments and Similar Recipes" />
      <br><br>
      <strong>Quick Actions (Save, Share, Send to Phone, Print)</strong><br>
      <img src="./public/images/Hinh_5.22.png" alt="Recipe Quick Actions" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Interactive Step-by-Step Progress (Web & Mobile)</strong><br>
      <img src="./public/images/Hinh_5.23_a.png" alt="Interactive Steps Web" width="48%" />
      <img src="./public/images/Hinh_5.23_b.png" alt="Interactive Steps Mobile" width="48%" />
    </td>
    <td align="center" width="50%">
      <strong>Mobile Shopping List (Serving Scaling) & Completion</strong><br>
      <img src="./public/images/Hinh_5.24_a.png" alt="Mobile Shopping List" width="48%" />
      <img src="./public/images/Hinh_5.24_b.png" alt="Mobile Cooking Completed" width="48%" />
    </td>
  </tr>
</table>

### 3. Recipe Publishing & AI Photo Search (Google Gemini)

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Create Recipe Form</strong><br>
      <img src="./public/images/Hinh_5.9.png" alt="Create Recipe Form" />
    </td>
    <td align="center" width="50%">
      <strong>Media Upload & Preview</strong><br>
      <img src="./public/images/Hinh_5.10.png" alt="Media Upload and Preview" />
      <br><br>
      <strong>AI Photo Search Modal</strong><br>
      <img src="./public/images/Hinh_5.11.png" alt="AI Photo Search Modal" />
      <br><br>
      <strong>AI Dish Recognition Results</strong><br>
      <img src="./public/images/Hinh_5.12.jpg" alt="AI Dish Recognition Results" />
    </td>
  </tr>
</table>

### 4. Authentication, OTP Recovery & User Profiles

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Login Page</strong><br>
      <img src="./public/images/Hinh_5.1_a.png" alt="Login Page" />
    </td>
    <td align="center" width="50%">
      <strong>Registration & Password Policy Check</strong><br>
      <img src="./public/images/Hinh_5.1_b.png" alt="Register Page" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>OTP Verification & Recovery Email</strong><br>
      <img src="./public/images/Hinh_5.2.png" alt="OTP Verification Screen" /><br>
      <img src="./public/images/Hinh_5.3.jpg" alt="OTP Email" />
    </td>
    <td align="center" width="50%">
      <strong>Member Profile, Edit Profile & Public Author Page</strong><br>
      <img src="./public/images/Hinh_5.13_a.png" alt="User Profile" width="48%" />
      <img src="./public/images/Hinh_5.13_b.png" alt="Edit Profile" width="48%" /><br>
      <img src="./public/images/Hinh_5.14.jpg" alt="Public Author Profile" width="85%" />
    </td>
  </tr>
</table>

### 5. Administration, Moderation & Audit Logging

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Admin Dashboard & Growth Analytics</strong><br>
      <img src="./public/images/Hinh_5.15.png" alt="Admin Dashboard" />
    </td>
    <td align="center" width="50%">
      <strong>User & Role Management</strong><br>
      <img src="./public/images/Hinh_5.16.png" alt="Admin User Management" />
      <br><br>
      <strong>Recipe Management</strong><br>
      <img src="./public/images/Hinh_5.17.png" alt="Admin Recipe Management" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Category Management</strong><br>
      <img src="./public/images/Hinh_5.18.png" alt="Admin Category Management" />
      <br><br>
      <strong>Comment Moderation</strong><br>
      <img src="./public/images/Hinh_5.19.png" alt="Admin Comment Moderation" />
    </td>
    <td align="center" width="50%">
      <strong>Violation Reports Review</strong><br>
      <img src="./public/images/Hinh_5.20.png" alt="Admin Violation Reports" />
      <br><br>
      <strong>Admin Audit Logs</strong><br>
      <img src="./public/images/Hinh_5.21.png" alt="Admin Audit Logs" />
    </td>
  </tr>
</table>

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19 + Vite SPA (`frontend/`), React Router, Axios, `react-hot-toast`, Cloudinary direct uploads |
| **Backend** | Node.js ($\ge 22.12$), Express 5 (`express@5.2.1`) |
| **Database & ORM** | MySQL 8.0, Prisma ORM (`@prisma/client@5.22.0`), `mysql2` |
| **Authentication & Security** | Dual Auth: `express-session` + `express-mysql-session` (`httpOnly` cookie) & SHA-256 `Bearer` tokens, `bcrypt`, `helmet`, custom multi-tier Rate Limiters, Magic-Bytes file validation |
| **AI & Recommendation** | Google Gemini (`@google/genai`), In-house Hybrid Recommender (`services/recommender/`) |
| **Email & Tooling** | Nodemailer (Gmail App Password OTP), Node.js built-in test runner (`node --test`), Playwright Chromium (`@playwright/test`) |

---

## Architecture & Project Structure

The backend follows a strict **4-layer Service–Repository architecture** (`Routes -> Controllers -> Services -> Repositories`), completely decoupling the pure mathematical recommendation engine (`services/recommender/`) from HTTP transport and Prisma data access.

```text
recipe-sharing-web/
├── config/            # Shared Prisma client & database configuration
├── controllers/       # HTTP request/response handlers (auth, recipes, interactions, admin, AI)
├── data/vifoodrec/    # ViFoodRec dataset source & import artifacts
├── docs/              # Recommender algorithm notes & evaluation reports
├── frontend/          # React 19 + Vite Single Page Application
├── middlewares/       # Dual auth (session + Bearer token), RBAC, CSRF/Origin check, rate limiters
├── prisma/            # Prisma schema (16 domain models + session store) & baseline guide
│   └── schema.prisma
├── public/images/     # UI screenshots & static assets
├── repositories/      # Data access layer (Prisma queries, transactions, safe projections)
├── routes/            # Express route definitions (/api/*, /healthz, /readyz)
├── scripts/           # Data import, interaction simulation, offline evaluation, DB migrations
├── services/          # Business logic (auth, admin moderation, Gemini AI, hybrid recommender)
│   └── recommender/   # Modular recommender (contentModel, cfModel, popularity, hybrid, textUtils)
├── tests/             # 4-tier automated test suite (Unit, HTTP Sandbox, MySQL Integration, E2E)
├── utils/             # Input/recipe validators, password policy, HTML sanitizer, mail helper
├── app.js             # Express application factory & graceful shutdown lifecycle
├── init_db.sql        # Base SQL bootstrap & seed schema
└── package.json
```

---

## Database Schema (17 Tables)

The MySQL database comprises **16 domain tables** managed via Prisma ORM plus the `sessions` table managed by `express-mysql-session`:

- **Identity & Access:** `users`, `api_tokens`, `password_reset_otps`, `sessions`
- **Recipes & Taxonomy:** `recipes`, `categories`, `ingredients`, `steps`, `recipe_media`, `tags`, `recipe_tags`, `meal_times`, `recipe_meal_times`
- **Community & Telemetry:** `comments`, `ratings` (`UNIQUE(user_id, recipe_id)`), `favorites` (`UNIQUE(user_id, recipe_id)`), `recipe_views` (24h `viewer_hash` deduplication)
- **Moderation & Governance:** `reports`, `admin_audit_logs`, `articles`

```mermaid
erDiagram
    users ||--o{ recipes : "creates"
    users ||--o{ comments : "writes"
    users ||--o{ ratings : "rates (1..5)"
    users ||--o{ favorites : "bookmarks"
    users ||--o{ api_tokens : "authenticates"
    users ||--o{ reports : "submits"
    users ||--o{ admin_audit_logs : "executes"
    categories ||--o{ recipes : "classifies"
    recipes ||--o{ ingredients : "requires"
    recipes ||--o{ steps : "includes"
    recipes ||--o{ recipe_media : "displays"
    recipes ||--o{ recipe_tags : "tagged_with"
    tags ||--o{ recipe_tags : "applies_to"
    recipes ||--o{ recipe_meal_times : "scheduled_for"
    meal_times ||--o{ recipe_meal_times : "groups"
    recipes ||--o{ comments : "receives"
    recipes ||--o{ ratings : "receives"
    recipes ||--o{ favorites : "saved_in"
    recipes ||--o{ recipe_views : "tracks"
```

---

## Security Architecture (Defense-in-Depth)

Designed with reference to **OWASP ASVS 5.0.0**, the platform enforces 6 defense layers:

1. **Authentication & Password Protection:** Passwords hashed with `bcrypt` (`cost = 10`); generic error responses prevent account enumeration.
2. **Dual Session & Token Lifecycle:** `httpOnly`, `SameSite` session cookies with `req.session.regenerate()` on login to prevent Session Fixation; SHA-256 hashed Bearer tokens; real-time user status synchronization on every request (`refreshSessionUser`) immediately revokes banned accounts or invalidated password versions.
3. **Atomic Single-Use OTP Recovery:** 6-digit OTPs expire after 5 minutes (`OTP_TTL_MS`), allow at most 5 failed attempts (`OTP_MAX_ATTEMPTS`), and are atomically consumed upon verification.
4. **Access Control & Admin Invariants:** Strict server-side RBAC (`isAuthenticated`, `isAdmin`), IDOR ownership checks on recipe mutations, and serialized transactions protecting the **last active administrator** from self-ban, self-demotion, or deletion.
5. **Multi-Tier Rate Limiting:** Sliding-window limiters across login (`5 failed / 15 min` per IP+account and `20 / 15 min` per IP), OTP (`3 / 10 min`), registration (`10 / hr`), community interactions (`30 / min`), and AI image scanning, returning `429 Too Many Requests` with `Retry-After`.
6. **Input Validation, Upload Verification & Safe Projections:** 100% parameterized queries via Prisma, server-side HTML sanitization against XSS, Magic-Bytes file signature verification (`JPEG/PNG/WEBP/GIF` $\le 5\text{ MB}$), `Origin` verification on state-changing requests, `Helmet` headers, and `SAFE_USER_SELECT` / `PUBLIC_USER_SELECT` projections that strip `password_hash` and OTP fields from all API responses.

---

## Getting Started

### Prerequisites

- **Node.js** $\ge 22.12$ and **npm**
- **MySQL** $8.0+$

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/td1205/recipe-sharing-web.git
cd recipe-sharing-web
npm install
npm install --prefix frontend
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the project root and `frontend/.env.example` to `frontend/.env`:

| Variable | Location | Required | Description |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | `.env` | Yes | Prisma MySQL connection URL (`mysql://user:pass@localhost:3306/recipe_db`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `.env` | Yes | MySQL connection settings for `express-mysql-session` |
| `SESSION_SECRET` | `.env` | Yes | Secret key ($\ge 32$ random chars in production) for signing session cookies |
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | `.env` | Yes | Gmail address and 16-char App Password for sending OTP emails |
| `GEMINI_API_KEY` | `.env` | For AI Search | Google Gemini API key ([get one at Google AI Studio](https://aistudio.google.com/apikey)) |
| `GEMINI_MODELS` | `.env` | No | Optional comma-separated fallback chain of Gemini models |
| `PORT`, `TRUST_PROXY`, `APP_ORIGIN` | `.env` | Production | Server port (`3000`), trusted reverse-proxy subnet, and canonical HTTPS origin |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | `frontend/.env` | Yes | Cloudinary cloud name and unsigned upload preset for media uploads |

### 3. Database Initialization

> **Note:** Only run `init_db.sql` against a newly created, disposable local database. For existing or production environments, follow the [Prisma Baseline & Adoption Procedure](prisma/BASELINE.md).

```bash
mysql -u root -p < init_db.sql
npx prisma db push
npx prisma generate
```

### 4. Start Development Servers

```bash
npm run dev
```

- **Frontend (Vite SPA):** `http://localhost:5173` (proxies `/api` to port `3000`)
- **Backend (Express API):** `http://localhost:3000`

---

## Testing & Quantitative Evaluation

The project includes a **4-tier automated testing and evaluation suite**:

| Command | Scope | Description |
| :--- | :--- | :--- |
| `npm run test:safe` | **Tier 1: Unit & Domain Logic** | Runs 12 in-memory test suites (**65/65 tests PASS** in ~1s) covering input/recipe validation, rate limiters, admin invariants, sorting/pagination, and recommender strategy/feedback/lifecycle. |
| `node --test tests/rateLimitRoutes.test.js tests/geminiService.test.js tests/tokenAuth.test.js` | **Tier 2: HTTP Sandbox & Service Mocks** | Runs **18/18 tests** against an ephemeral loopback Express server to verify middleware ordering, `429 Retry-After` headers, SHA-256 Bearer auth, and Gemini multi-model fallback. |
| `npm run test:database` & `npm run test:admin` | **Tier 3: Isolated MySQL Integration** | Verifies real MySQL `FK/CASCADE/UNIQUE/CHECK` constraints, atomic transactions, concurrent rating/favorite upserts, and `SELECT ... FOR UPDATE` last-admin protection on an isolated `recipe_test_*` database (requires `RUN_DATABASE_TESTS=yes` and `TEST_DB_CONFIRMED=yes`). |
| `npm run test:e2e` | **Tier 4: Browser End-to-End (Playwright)** | Drives Chromium through registration, login, recipe CRUD, search, favorites/ratings, and admin moderation across React + Express + MySQL (requires `RUN_BROWSER_DATABASE_TESTS=yes`). |
| `npm run recommend:evaluate` | **Recommender Evaluation (Multi-seed LOO)** | Evaluates `Popularity`, `Content-Based`, `Item-CF`, `Hybrid`, and `Switching` strategies (`HitRate@10`, `Precision@10`, `NDCG@10`). |
| `npm run recommend:evaluate:offline -- IN.json OUT.json` | **Offline Reproducible Benchmark** | Evaluates local JSON interaction datasets without database connectivity and outputs a full metric & provenance report. |

---

## Production Deployment & Readiness

1. Build the frontend bundle and verify the safe test suite:
   ```bash
   npm ci && npm ci --prefix frontend
   npm run test:safe
   npm run lint --prefix frontend
   npm run build --prefix frontend
   ```
2. Configure `NODE_ENV=production`, a strong `SESSION_SECRET` ($\ge 32$ chars), `APP_ORIGIN`, `TRUST_PROXY`, and database credentials, then start the server:
   ```bash
   npm start
   ```
3. **Health Probes & Graceful Shutdown:**
   - `GET /healthz`: Process liveness probe.
   - `GET /readyz`: Readiness probe checking both Prisma MySQL connectivity and the session store (returns `503` on timeout, failure, or shutdown drain).
   - Handles `SIGTERM` / `SIGINT` with connection draining and clean teardown of HTTP, session pool, and Prisma client.

---

## Authors & Contributors

- **[td1205](https://github.com/td1205)** — Project Lead
- **[TuanHara](https://github.com/TuanHara)** — Core Developer
- **[23010710-duy](https://github.com/23010710-duy)** — Contributor (v1)

## License

This project is licensed under the **ISC License**.
