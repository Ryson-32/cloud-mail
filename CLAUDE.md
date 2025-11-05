# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud Mail is a serverless email service deployed on Cloudflare Workers. It's a monorepo with two main components:

- **Frontend** (`mail-vue/`): Vue 3 + Element Plus SPA
- **Backend** (`mail-worker/`): Hono web framework with Drizzle ORM

**Cloudflare Services:**
- **D1**: SQLite database
- **KV**: Key-value cache
- **R2**: Object storage for attachments
- **Workers**: Serverless compute
- **Email Routing**: Inbound email handling

**External Services:**
- **Resend**: Outbound email delivery

## Development Commands

### Frontend (mail-vue/)
```bash
npm run dev      # Dev server (localhost:3001)
npm run remote   # Dev against remote API
npm run build    # Production build → ../mail-worker/dist
npm run preview  # Preview production build
```

### Backend (mail-worker/)
```bash
npm run dev     # Local dev with wrangler (requires wrangler-dev.toml)
npm run start   # Alternative dev command
npm test        # Deploy to test environment (wrangler-test.toml)
npm run deploy  # Deploy to production (wrangler.toml)
```

**Testing:**
- Framework: Vitest with `@cloudflare/vitest-pool-workers`
- Config: `vitest.config.js`
- Test files: `test/` directory

### Configuration
- Frontend env files: `.env.dev`, `.env.remote`, `.env.release`
- Backend config: `wrangler.toml` (copy from `wrangler.example.toml`)
- Required wrangler bindings: `db` (D1), `kv` (KV), `r2` (R2), `assets` (static files)

## Architecture

### Request Flow
1. **Worker Entry** (`mail-worker/src/index.js`):
   - `/api/*` routes → Hono app (strips `/api` prefix)
   - Other routes → Static assets from `env.assets`
   - Email handler → `email.js` for inbound mail processing
   - Scheduled tasks → Daily cron (cleanup, stats reset)

2. **Hono Setup** (`mail-worker/src/hono/webs.js`):
   - Imports all API routes from `src/api/*.js`
   - Applies security middleware from `src/security/security.js`
   - Each API file registers routes using Hono instance

3. **Frontend Build**:
   - Vite builds to `../mail-worker/dist` (see `vite.config.js:32`)
   - Worker serves these assets via `assets` binding
   - SPA routing handled by `not_found_handling: "single-page-application"`

### Backend Structure
- **`src/api/`**: Hono route handlers (thin controllers)
- **`src/service/`**: Business logic layer
- **`src/dao/`**: Data access layer (analysis queries)
- **`src/entity/`**: Drizzle schema definitions (D1 tables)
  - `orm.js`: Creates Drizzle instance from `c.env.db`
  - Table schemas use `drizzle-orm/sqlite-core`
- **`src/email/`**: Inbound email processing (Cloudflare Email Routing)
- **`src/security/`**: JWT auth middleware
- **`src/init/`**: Database migration system
- **`src/utils/`**: Shared utilities
- **`src/i18n/`**: Internationalization (i18next)

### Frontend Structure
- **`src/views/`**: Page components (email, login, settings, admin)
- **`src/layout/`**: Layout components (header, aside, main)
- **`src/components/`**: Reusable UI components
- **`src/router/`**: Vue Router setup
- **`src/store/`**: Pinia stores (persisted state)
- **`src/axios/` & `src/request/`**: API client setup
- **`src/perm/`**: Permission directive system (RBAC)
- **`src/db/`**: IndexedDB (Dexie) for local storage
- **`src/i18n/`**: Vue I18n setup

### Database Schema
Drizzle entities define table schemas (see `mail-worker/src/entity/`):
- `user`: Users with OAuth support (Linux.do)
- `account`: Email accounts (multi-account mode)
- `email`: Email messages with threading support
- `att`: Attachment metadata (files in R2)
- `star`: Starred/flagged emails
- `role`, `perm`, `role_perm`: RBAC system
- `setting`: Global configuration
- `reg_key`: Registration keys
- `verify_record`: Verification attempts

Migrations run via `/api/init/:secret` endpoint (`src/init/init.js`). Version-based migration system from `intDB` through `v1_11DB`.

### Key Features
- **RBAC**: Role-based access control with permission middleware
- **Multi-account**: Users can manage multiple email accounts
- **Email Threading**: `inReplyTo` and `messageId` for conversation threads
- **Attachment Support**: R2 storage with metadata in D1
- **OAuth**: Linux.do OAuth integration with trust levels
- **Daily Tasks**: Scheduled job resets rate limits and cleanup
- **Turnstile CAPTCHA**: Bot protection for registration
- **Email Forwarding**: Forward to Telegram or other providers

## Important Notes

### Database Initialization
First deployment requires running `/api/init/{jwt_secret}` to create tables. See `mail-worker/src/init/init.js` for migration logic.

### Environment Variables
Backend uses `wrangler.toml` `[vars]` section:
- `domain`: Array of email domains
- `admin`: Admin email address
- `jwt_secret`: JWT signing key
- `orm_log`: Enable Drizzle query logging
- OAuth credentials (optional): `LINUX_DO_CLIENT_ID`, `LINUX_DO_CLIENT_SECRET`

### Build Process
Frontend build outputs to `mail-worker/dist`, which is deployed with the worker. Always build frontend before deploying worker in production.

### Email Processing
Cloudflare Email Routing forwards to worker's `email` handler. Uses `postal-mime` for parsing. See `mail-worker/src/email/email.js`.

### Security
JWT tokens stored in Pinia (persisted to localStorage). Backend validates via `src/security/security.js` middleware. Password hashing includes per-user salt.
