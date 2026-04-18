# Demo Runbook

## 1) One-time setup

- Install dependencies:
  - Backend: `npm install`
  - Frontend: `cd frontend && npm install`
- Copy `.env.example` to `.env` (or ensure `.env` contains):
  ```
  DATABASE_URL="postgresql://marketplace:marketplace@localhost:5432/marketplace"
  ```

## 2) Start PostgreSQL (Docker — one command)

```bash
docker compose up -d db
```

This starts PostgreSQL 16 on `localhost:5432` and waits until healthy.  
To stop and wipe data: `docker compose down -v`

## 3) Reset + seed demo data

```bash
npm run prisma:generate
npm run prisma:seed
```

## 4) Start application

- Terminal A (backend): `npm run dev`
- Terminal B (frontend): `cd frontend && npm run dev`

Or, as a single script if you've added `concurrently`:

```bash
npm run dev:all
```

## 5) Demo credentials

| Role           | Email                             | Password       |
| -------------- | --------------------------------- | -------------- |
| Admin          | `admin@marketplace.local`         | `ChangeMe123!` |
| Approved agent | `agent@marketplace.local`         | `ChangeMe123!` |
| Pending agent  | `pending-agent@marketplace.local` | `ChangeMe123!` |
| User           | `user@marketplace.local`          | `ChangeMe123!` |

## 6) Suggested walkthrough order

### Admin flow

1. Login as admin and open `/admin`.
2. Review pending agent applications and approve one.
3. Review pending listings and approve/reject.
4. Verify analytics counters update after moderation actions.

### Agent flow

1. Login as approved agent and open `/agent`.
2. Create a new listing with media URL.
3. Open inquiries and send a response.
4. Review tour requests and confirm one.

### User flow

1. Login as user and open `/`.
2. Filter listings by location/price/property type.
3. Add a favorite, submit inquiry, submit tour request.
4. Open message threads and send a reply.
5. Add listing review and check notification events.

## 7) Pre-demo sanity checks

```bash
# Backend
npm run typecheck && npm test

# Frontend
cd frontend && npm test && npm run build

# API spot checks (backend must be running)
curl http://localhost:4000/health   # → {"status":"ok"}
curl http://localhost:4000/         # → API metadata
```
