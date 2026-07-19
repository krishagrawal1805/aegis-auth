<p align="center">
  <img src="https://img.shields.io/badge/FIDO2-WebAuthn-00ff66?style=for-the-badge&logo=webauthn&logoColor=white" alt="FIDO2" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

# Aegis — Cryptographic Authentication Gateway

> **Passwordless FIDO2/Passkey authentication platform with cross-device verification, M-of-N threshold approvals, and a tamper-evident cryptographic audit ledger.**

Aegis replaces passwords entirely with hardware-bound credentials. It is purpose-built for **infrastructure teams** managing critical systems — where the cost of unauthorized access is catastrophic.

---

## Key Features

### 🔐 Passwordless Authentication (FIDO2/WebAuthn)
Users register a passkey tied to their device's biometrics (fingerprint, Face ID, Windows Hello). No passwords are stored anywhere — the private key never leaves the device's secure enclave.

### 📱 Cross-Device Login with Number Matching
When logging in from a new device, the existing authenticated device receives a real-time push notification via SSE. The user must match a 2-digit code to prove intentional approval — preventing **MFA fatigue attacks** (the same technique used by Microsoft Authenticator).

### ✍️ M-of-N Threshold Approvals
Critical operations (e.g., production database actions) require **multiple administrators** to independently co-sign with their passkeys before execution. The system enforces role-based eligibility and prevents double-signing via atomic database guards.

### 📜 Cryptographic Audit Ledger
Every security event is recorded in a **blockchain-style tamper-evident chain**. Each log entry contains the SHA-256 hash of the previous entry — if any record is modified or deleted, the chain breaks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│   Landing Page │ Register │ Login │ Dashboard │ Audit Ledger    │
│                    @simplewebauthn/browser                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + SSE (Server-Sent Events)
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (Express.js)                        │
│                                                                 │
│  Auth Controller ──── Challenge Store (in-memory, 5min TTL)     │
│  │  ├── /register/challenge   → WebAuthn registration options   │
│  │  ├── /register/verify      → Verify attestation + issue JWT  │
│  │  ├── /login/challenge      → Auth options + number matching  │
│  │  ├── /login/verify         → Verify assertion + SSE push     │
│  │  └── /session/exchange     → Cross-device token swap         │
│  │                                                              │
│  Approval Controller ── Approval Request Model                  │
│  │  ├── /request              → Create pending M-of-N request   │
│  │  ├── /pending              → Fetch eligible pending requests │
│  │  └── /sign                 → Submit cryptographic signature  │
│  │                                                              │
│  SSE Controller ──── SSE Store (connection manager)             │
│  │  └── /events               → Real-time event stream          │
│  │                                                              │
│  Audit Controller ── Audit Queue (sequential SHA-256 chaining)  │
│     └── /audit-logs           → Fetch tamper-evident ledger     │
│                                                                 │
│  Security: HttpOnly JWT cookies │ CORS │ Cookie Parser          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   MongoDB   │
                    │  ┌────────┐ │
                    │  │ Users  │ │
                    │  │Approval│ │
                    │  │AuditLog│ │
                    │  └────────┘ │
                    └─────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA with real-time SSE listeners and dynamic layouts |
| Styling | Steep Editorial Light Theme | Premium light-palette visual design following DESIGN.md specifications |
| Animation | Framer Motion | GPU-accelerated micro-interactions & E2E looped auth pipeline simulation |
| Icons | Lucide Icons | Clean SVG symbols |
| WebAuthn (Client) | `@simplewebauthn/browser` | Passkey registration & authentication |
| Backend | Express.js (Node.js) | REST API + SSE streaming |
| WebAuthn (Server) | `@simplewebauthn/server` | Cryptographic attestation verification |
| Database | MongoDB + Mongoose | Users, approvals, audit chain |
| Auth | JWT (HttpOnly cookies) | Stateless session management |
| Real-time | Server-Sent Events (SSE) | Cross-device login push & approval notifications |

---

## Project Structure

```
aegis-auth/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                  # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js      # Registration, login, cross-device exchange
│   │   │   ├── approvalController.js  # M-of-N threshold approval logic
│   │   │   ├── auditController.js     # Audit log retrieval
│   │   │   └── sseController.js       # SSE connection handler
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js      # JWT verification guard
│   │   ├── models/
│   │   │   ├── User.js               # User profile, role, & WebAuthn credentials
│   │   │   ├── ApprovalRequest.js    # M-of-N request + signatures
│   │   │   └── AuditLog.js           # Blockchain-style audit entry
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── approvalRoutes.js
│   │   │   ├── auditRoutes.js
│   │   │   └── sseRoutes.js
│   │   ├── stores/
│   │   │   ├── challengeStore.js     # In-memory WebAuthn challenge (5min TTL)
│   │   │   ├── exchangeStore.js      # Cross-device session token (60s TTL)
│   │   │   ├── sseStore.js           # SSE connection manager
│   │   │   └── auditQueue.js         # Sequential SHA-256 chain processor
│   │   ├── utils/
│   │   │   └── jwt.js                # Token generation & cookie helpers
│   │   └── server.js                 # Express app entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx       # Steep Editorial landing page & looped simulation
│   │   │   ├── Register.jsx          # Passkey registration form
│   │   │   ├── Login.jsx             # Cross-device login with manual fallback
│   │   │   ├── Dashboard.jsx         # Command center + SSE listener
│   │   │   ├── Approvals.jsx         # Pending M-of-N approval queue
│   │   │   └── AuditLog.jsx          # Tamper-evident ledger viewer
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # React auth state provider
│   │   ├── services/
│   │   │   └── api.js                # Fetch wrapper with HttpOnly cookies
│   │   ├── App.jsx                   # Root router
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Global Steep design styles
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── package.json                       # Root monorepo scripts
├── simulate.js                        # E2E WebAuthn & SSE flow simulation script
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ 
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`
- A browser that supports WebAuthn (Chrome, Edge, Firefox, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/DevOps-Tally/Shall_We_Develop_.git
cd Shall_We_Develop_

# Install root dependencies
npm install

# Install backend and frontend dependencies
npm run install:all
```

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### Running the Application

```bash
# Start both backend and frontend concurrently
npm run dev
```

Or start them individually:

```bash
# Terminal 1 — Backend (port 8000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

Open `http://localhost:3000` in your browser.

---

## Demo Flow

### 1. Register Two Users
- Open two browser windows: one **Normal window** and one **Incognito window** to isolate sessions.
- In the normal window, register an **Admin** user. This automatically initializes a new workspace and generates a unique 6-character Workspace Code.
- In the incognito window, register an **Approver** user using the Workspace Code generated by the Admin.

### 2. Member Approval
- Switch to the Admin window and navigate to the **Workspace Members** tab.
- Find the pending Approver's request and click **Approve as Approver**.
- The Approver can now enter the Workspace Code and email on the Login screen, completing biometric verification to gain dashboard access.

### 3. Threshold Approval
- In the Admin dashboard, click **Request Database Wipe**.
- A pending authorization request appears instantly in the approvals queue of both users.
- Click **Bypass Sign (Mock)** (or use Windows Hello passkeys) on both devices.
- Once both co-signatures are provided, the request executes immediately.

### 4. Audit Ledger
- Navigate to the **Audit Ledger** tab to view the cryptographically chained event ledger complete with row-level SHA-256 HMAC signatures.

---

## Security Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Passkeys over passwords** | Eliminates credential stuffing, phishing, and database breaches |
| **Number matching** | Prevents MFA fatigue attacks (Uber 2022 breach vector) |
| **HttpOnly JWT cookies** | Prevents XSS token theft — JavaScript cannot read the token |
| **In-memory challenge store with TTL** | Challenges auto-expire in 5 minutes to prevent replay attacks |
| **Single-use exchange tokens (60s TTL)** | Cross-device session tokens are consumed immediately and expire fast |
| **Atomic MongoDB updates** | `findOneAndUpdate` with `$ne` guard prevents double-signing race conditions |
| **SHA-256 chained audit log** | Tamper-evident — modifying any record invalidates all subsequent hashes |
| **SSE over WebSockets** | Lighter, auto-reconnects, works through proxies, unidirectional (server→client) |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/challenge` | Generate WebAuthn registration options |
| POST | `/api/auth/register/verify` | Verify registration attestation |
| POST | `/api/auth/login/challenge` | Generate login challenge + number match |
| POST | `/api/auth/login/verify` | Verify login assertion |
| POST | `/api/auth/session/exchange` | Cross-device token exchange |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Get current user info |

### Approvals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/approvals/request` | Create M-of-N approval request |
| GET | `/api/approvals/pending` | Get pending requests for current role |
| POST | `/api/approvals/sign` | Submit cryptographic signature |

### Real-time & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | SSE event stream |
| GET | `/api/audit-logs` | Fetch audit ledger |
| GET | `/api/health` | Health check |

---

## Team

Built by **Krish Agrawal & Krishna Arora**

---

## License

MIT
