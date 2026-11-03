# BugTrack AI 🚀
### Intelligent Software Issue Management & Code Change Risk Analysis Platform

[![Status](https://img.shields.io/badge/Status-Production%20Ready-emerald.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-blue.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-indigo.svg)]()
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20Prisma%20ORM-cyan.svg)]()
[![AI Engine](https://img.shields.io/badge/AI-Gemini%201.5%20%7C%20Deterministic%20Fallback-amber.svg)]()
[![Tests](https://img.shields.io/badge/Tests-18%2F18%20Passing-success.svg)]()

---

## 1. Project Overview & Problem Statement

Modern software engineering teams frequently experience a critical disconnect between **defect reporting**, **developer pull requests**, and **regression verification**:
- **Unstructured Bug Reports**: QA testers and end-users often file vague, non-reproducible defect tickets lacking systematic steps, expected behavior, or accurate severity.
- **Redundant Defect Tickets**: Duplicates slip past triage teams, consuming valuable developer hours.
- **Blind Code Merges**: Developers create pull requests without visibility into the blast radius of their changes or which adjacent modules require regression testing.
- **Untracked QA Verifications**: Issues are marked "Closed" without documented verification checklists or proof that boundary edge cases were evaluated.

**BugTrack AI** solves this problem by closing the loop across the entire bug lifecycle:
```
Bug Reporting ──▶ AI Report Structuring ──▶ Intelligent Duplicate Detection 
     │
     ▼
Smart Priority & Dev Workload Assignment ──▶ GitHub PR Linking ──▶ AI Code Change Risk Analysis 
     │
     ▼
Suggested Regression Test Scenarios ──▶ Tester Verification Checklist ──▶ Issue Closure / Auto-Reopen
```

---

## 2. Key Features

### 🤖 1. AI Bug Report Generator
- Tester provides an unstructured, plain-language defect observation (e.g., *"After updating my profile picture, clicking save makes the profile page blank."*).
- The AI Engine structures it into:
  - Concise imperative title
  - Executive summary
  - Numbered reproduction steps
  - Expected vs. Actual results
  - Suggested Severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - Suggested Priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with technical rationale
- **Tester Editorial Control**: All fields remain fully editable; no AI report is submitted without human review and approval.
- **Hybrid AI Architecture**: Seamlessly calls Google Gemini API when configured, or executes the **BugTrack Local Deterministic Fallback Engine** with zero external dependencies.

### 🔍 2. Intelligent Duplicate Detection
- Compares incoming defect descriptions against all existing issues in the project.
- Uses token normalization, stopword filtering, n-gram matching, and Jaccard similarity scoring.
- Displays match percentages, overlapping keywords, issue statuses, and assignees.
- Non-destructive: Warns the tester without preventing submission.

### ⚖️ 3. Smart Priority & Developer Workload Assignment
- **Priority Recommendation**: Explains the rationale behind severity and urgency classification.
- **Workload & Skill Matching Algorithm**: Evaluates active open issues (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `REOPENED`) per developer alongside domain skills (e.g., React, Node, Security, Auth, DB) to recommend optimal assignment.
- **Admin Approval Required**: Recommendations are presented for review; project administrators make the final assignment.

### 🐙 4. GitHub PR Integration & AI Code Change Risk Analysis
- Links public GitHub Pull Request URLs (e.g., `https://github.com/facebook/react/pull/28419`) or manual patch metadata.
- Automatically parses changed files, commit diffs, and pull request descriptions.
- Generates a comprehensive **AI Code Change Risk Analysis**:
  - **Risk Level**: `LOW`, `MEDIUM`, or `HIGH`
  - **Change Summary**: Human-readable overview of developer modifications
  - **Affected Modules & Files**: Direct blast radius
  - **Potential Risk Areas**: Specific architectural regression risks
  - **Suggested Regression Test Cases**: Concrete verification scenarios
  - **Missing Test Scenarios / Boundary Conditions**: Edge cases
  - **Disclaimer**: Compliant advisory labeling (does not claim code correctness without test execution).

### ✅ 5. Regression Testing & Verification Protocol
- Automatically activates when a developer moves an issue to `READY_FOR_TESTING`.
- Provides an interactive checklist of suggested regression test scenarios.
- QA Testers mark individual scenarios **Pass** or **Fail** and attach reproduction notes.
- **State Machine Enforcement**:
  - All scenarios passed ➔ Issue transitions to `CLOSED`.
  - Any scenario fails ➔ Issue transitions automatically to `REOPENED`.
  - Complete verification history is preserved in the SQLite database.

### 📊 6. Real-Time Dashboard & Analytics
- Live aggregation cards: Total Projects, Total Issues, Open, In Progress, Ready for Testing, Closed, Reopened, Critical.
- Interactive Recharts powered by actual SQLite database queries:
  - Issues by Status (Donut chart)
  - Defects by Severity (Bar chart)
  - Issues by Priority (Bar chart)
  - Developer Workload & Capacity (Grouped bar chart)
  - Issue Creation Trend (Time series line chart)
- Project filter dropdown for workspace-specific telemetry.

### 🛡️ 7. Role-Based Access Control (RBAC)
- **ADMIN**: Create projects, manage team members, assign defects, view system command center.
- **TESTER**: Report bugs, use AI structuring, view duplicate suggestions, execute regression verifications, reopen failed issues.
- **DEVELOPER**: View assigned bugs, start development (`IN_PROGRESS`), link GitHub PRs, inspect AI risk analysis, move issues to `READY_FOR_TESTING`.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, React Router v6, Axios, Lucide React, Recharts |
| **Backend** | Node.js (v24), Express.js, REST APIs, JSON Web Tokens (JWT), bcryptjs, express-rate-limit |
| **Database** | SQLite, Prisma ORM 5.22 (automated migrations & seeding) |
| **AI Engine** | Google Gemini API + BugTrack Local Deterministic Fallback Engine |
| **GitHub** | GitHub REST API, Webhook signature verification (HMAC-SHA256) |
| **Testing** | Vitest 2.1, Supertest 7 |

---

## 4. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite SPA                     │
│  (Tailwind UI, Recharts, Context Providers, Axios)     │
└───────────────────────────┬────────────────────────────┘
                            │ /api requests (JWT Bearer)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js Backend                    │
│ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│ │  Auth & RBAC   │ │ Rate Limiting  │ │ Error Handler│ │
│ └────────────────┘ └────────────────┘ └──────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │  Controllers: Auth, Projects, Issues, AI, GitHub   │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────┐ │
│ │  Services: Gemini, Fallback AI, Duplicate, GitHub  │ │
│ └────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────▼────────────────────────────┐
│                 SQLite Database (dev.db)               │
│  (Users, Projects, Members, Issues, Activities, PRs,   │
│   Comments, Verifications)                             │
└────────────────────────────────────────────────────────┘
```

---

## 5. Folder Structure

```
bugtrack-ai/
├── package.json              # Root orchestration (dev, build, test, db:setup)
├── .gitignore
├── README.md
├── server/
│   ├── package.json          # Express backend configuration
│   ├── .env.example
│   ├── .env                  # Development environment defaults
│   ├── prisma/
│   │   ├── schema.prisma     # SQLite Prisma models & relations
│   │   ├── seed.js           # Automated demo data seeder
│   │   └── dev.db            # Persistent SQLite database file
│   ├── src/
│   │   ├── config/           # Database & environment constants
│   │   ├── controllers/      # REST API route handlers
│   │   ├── middleware/       # JWT auth, RBAC, rate limiter, error handler
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Gemini AI, Fallback Engine, Duplicate, GitHub
│   │   ├── utils/            # JWT token helpers
│   │   ├── app.js            # Express application instance
│   │   └── server.js         # HTTP server entrypoint
│   └── tests/
│       ├── auth.test.js              # Auth & protected route tests
│       ├── issues_and_projects.test.js # Lifecycle & verification tests
│       └── ai_and_github.test.js     # AI engine & duplicate tests
└── client/
    ├── package.json          # React + Vite frontend configuration
    ├── vite.config.js        # Vite build & proxy settings
    ├── tailwind.config.js    # Custom dark navy theme & accents
    ├── index.html
    └── src/
        ├── components/       # Badges, Modal, Timeline, RiskPanel, Checklist
        ├── context/          # AuthContext, ToastContext
        ├── layouts/          # DashboardLayout, Sidebar, Navbar
        ├── pages/            # 14 functional pages (Dashboard, Issues, PRs...)
        ├── services/         # Axios API client with interceptors
        ├── App.jsx           # React Router route tree & guards
        └── main.jsx          # Entry point
```

---

## 6. Database Design

```prisma
model User {
  id           String          @id @default(cuid())
  name         String
  email        String          @unique
  passwordHash String
  role         String          @default("DEVELOPER") // ADMIN, TESTER, DEVELOPER
  skills       String          @default("General")
  createdAt    DateTime        @default(now())
  // Relations to Projects, Issues, Comments, Activities, Verifications
}

model Project {
  id               String          @id @default(cuid())
  name             String
  description      String?
  ownerId          String
  githubRepository String?
  createdAt        DateTime        @default(now())
  // Relations to User (Owner), ProjectMember[], Issue[]
}

model Issue {
  id               String         @id @default(cuid())
  issueKey         String         @unique // e.g. FIN-101
  projectId        String
  title            String
  description      String
  stepsToReproduce String?
  expectedResult   String?
  actualResult     String?
  environment      String?
  severity         String         @default("MEDIUM")
  priority         String         @default("MEDIUM")
  status           String         @default("OPEN")
  reporterId       String
  assigneeId       String?
  // Relations to Project, Reporter, Assignee, Comments, Activities, PRs, Verifications
}

model PullRequest {
  id          String   @id @default(cuid())
  issueId     String
  repository  String
  prNumber    Int
  title       String
  url         String
  state       String   @default("open")
  changedFiles String  @default("[]")
  aiSummary   String?
  riskNotes   String?  // JSON string storing AI Risk Analysis report
}

model Verification {
  id        String   @id @default(cuid())
  issueId   String
  testerId  String
  result    String   // PASSED, FAILED
  testNotes String?
  testedAt  DateTime @default(now())
}
```

---

## 7. Demo Accounts & Credentials

The database is pre-seeded with three demo accounts representing the primary system roles. **You can click the 1-click demo buttons directly on the Login page to pre-fill credentials instantly:**

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Admin** | `admin@bugtrack.ai` | `Admin@123` | Create projects, allocate developers, manage priorities, system dashboard |
| **Tester** | `tester@bugtrack.ai` | `Tester@123` | File AI bug reports, review duplicate detection, submit regression verifications |
| **Developer** | `developer@bugtrack.ai` | `Developer@123` | View assigned queue, link GitHub PRs, inspect AI risk analysis, move to QA |

Additional pre-seeded developers:
- `alex.dev@bugtrack.ai` / `Dev@12345` (Backend & Docker specialist)
- `sarah.fullstack@bugtrack.ai` / `Dev@12345` (Frontend & UI/UX specialist)

---

## 8. Installation & Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node v24)
- **npm**: v9.0.0 or higher

### Step 1: Clone or Navigate to the Workspace
```bash
cd C:\Users\tamil\.gemini\antigravity\scratch\bugtrack-ai
```

### Step 2: Automated Database Setup & Seeding
```bash
npm run db:setup
```
*This command runs Prisma client generation, creates the SQLite `dev.db` database, applies all schema tables, and populates initial demo users, projects, issues, PRs, and verifications.*

### Step 3: Start Frontend and Backend Concurrently
```bash
npm run dev
```
Both applications will start in parallel:
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

---

## 9. Environment Variables (`server/.env`)

```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="bugtrack-ai-super-secret-jwt-key-2025-secure"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"

# Optional Cloud Integrations (Application runs seamlessly with local fallback if empty)
GEMINI_API_KEY=""
GITHUB_TOKEN=""
WEBHOOK_SECRET="bugtrack-webhook-secret-token"
```

---

## 10. AI Engine & Local Fallback Architecture

BugTrack AI is engineered for **100% resilient operation**:
1. **Gemini API Mode**: When `GEMINI_API_KEY` is provided, requests are dispatched to `gemini-1.5-flash` for high-fidelity structured generation and PR risk analysis.
2. **Local Deterministic Fallback Mode**: If no API key is configured or if an external network timeout occurs:
   - Defect observations are parsed by an intelligent deterministic engine that extracts entities, action verbs, and system failure tokens.
   - Generates structured reproduction steps, expected/actual results, severity, and labels.
   - Code change analysis deterministically inspects file extensions, security-sensitive filenames (`auth`, `jwt`, `db`, `prisma`), and file count blast radius.
   - The UI clearly displays an **Engine: Local Deterministic Fallback** badge.

---

## 11. REST API Documentation

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user & return JWT token
- `GET /api/auth/me` - Get profile for current authenticated user
- `GET /api/auth/users` - Directory of team members and active workloads
- `PUT /api/auth/profile` - Update user skills or change password

### Projects
- `POST /api/projects` - Create a new project workspace (ADMIN)
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details with members & issue counts
- `PUT /api/projects/:id` - Update project metadata
- `DELETE /api/projects/:id` - Delete project (ADMIN)
- `POST /api/projects/:id/members` - Add team member to project
- `DELETE /api/projects/:id/members/:userId` - Remove member from project

### Issues & Lifecycle
- `POST /api/issues` - Report new bug (TESTER / ADMIN)
- `GET /api/issues` - Filterable issue registry (`projectId`, `status`, `severity`, `search`)
- `GET /api/issues/:id` - Get issue with comments, activities, PRs, and verifications
- `PUT /api/issues/:id` - Update issue fields
- `PATCH /api/issues/:id/status` - Transition status (`OPEN` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `READY_FOR_TESTING` ➔ `CLOSED`/`REOPENED`)
- `PATCH /api/issues/:id/assign` - Assign developer to defect (ADMIN)
- `POST /api/issues/:id/comments` - Post technical comment
- `POST /api/issues/:id/verification` - Submit regression verification (TESTER / ADMIN)

### AI Intelligence
- `POST /api/ai/structure-report` - Generate structured bug report from raw text
- `POST /api/ai/find-duplicates` - Scan project for similar defects
- `POST /api/ai/suggest-priority` - Suggest priority based on defect severity and keywords
- `POST /api/ai/review-change` - Analyze PR code changes for risk, blast radius & regression tests
- `POST /api/ai/recommend-developer` - Rank developers by skill matching & active workload

### GitHub Integration & Webhooks
- `POST /api/github/connect` - Validate and attach public repo URL
- `POST /api/github/link-pr` - Link PR to defect and execute AI Risk Analysis
- `GET /api/github/pr/:owner/:repo/:number` - Inspect PR via GitHub REST API
- `POST /api/webhooks/github` - Webhook listener for GitHub push and pull_request events

---

## 12. Automated Test Results

The backend includes a comprehensive integration test suite executed via Vitest and Supertest:
```
 ✓ tests/ai_and_github.test.js (5 tests)
 ✓ tests/auth.test.js (5 tests)
 ✓ tests/issues_and_projects.test.js (8 tests)

 Test Files  3 passed (3)
      Tests  18 passed (18)
   Duration  1.30s
```

Run tests at any time using:
```bash
npm run test
```

---

## 13. Production Build Verification

The frontend production build compiles cleanly with Vite:
```bash
npm run build
```
Output:
```
dist/index.html                   1.28 kB │ gzip:   0.70 kB
dist/assets/index-FGEzBYUx.css   45.70 kB │ gzip:   7.83 kB
dist/assets/index-i8d7XF8k.js   843.65 kB │ gzip: 229.94 kB
✓ built in 16.28s
```

---

## 14. License

BugTrack AI is open-source under the MIT License.
