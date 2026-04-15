# Moderated Real Estate Marketplace

TypeScript-only moderated marketplace with three roles:
- `ADMIN`: approves agents and listings, manages users/categories/CMS, monitors analytics.
- `AGENT`: onboards with verification, manages listings and media, responds to inquiries/tours.
- `USER`: searches listings, favorites properties, sends inquiries, schedules tours, leaves reviews.

## Tech Stack
- Node.js + Express
- PostgreSQL + Prisma ORM
- React (typed frontend app with role routes and auth context)
- Strict TypeScript

## Run Locally
1. Copy `.env.example` to `.env` and set secrets.
2. Install dependencies: `npm install`
3. Validate Prisma schema: `npm run prisma:validate`
4. Generate Prisma client: `npm run prisma:generate`
5. Start API: `npm run dev`
6. In a second terminal: `cd frontend && npm install && npm run dev`

### Required backend environment variables
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Access token signing secret.
- `JWT_REFRESH_SECRET`: Refresh token signing secret.

### Optional frontend environment variables
- `VITE_API_BASE_URL`: API base URL for the React app (defaults to `http://localhost:4000`).

## Test
- Backend typecheck: `npm run typecheck`
- Backend tests: `npm test`
- Frontend typecheck: `cd frontend && npx tsc --noEmit`
- Frontend tests: `cd frontend && npm test`

## Database
- Prisma schema: `prisma/schema.prisma`
- Validate schema: `npm run prisma:validate`
- Generate Prisma client: `npm run prisma:generate`
- Create migration SQL from schema: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_init/migration.sql`
- Seed demo users: `npm run prisma:seed`

## API Documentation
- OpenAPI contract: `docs/openapi.yaml`
- Demo runbook: `docs/demo-runbook.md`
- Staging checklist: `docs/staging-checklist.md`
