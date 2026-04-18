# Local/Staging Readiness Checklist

## Build + Tests
- [ ] Backend typecheck: `npm run typecheck`
- [ ] Backend tests: `npm test`
- [ ] Frontend tests: `cd frontend && npm test`
- [ ] Frontend build: `cd frontend && npm run build`

## Data + Runtime
- [ ] Prisma client generated: `npm run prisma:generate`
- [ ] Demo seed run: `npm run prisma:seed`
- [ ] Backend running at `http://localhost:4000`
- [ ] Frontend running at Vite dev URL

## API Sanity
- [ ] `GET /` returns API metadata
- [ ] `GET /health` returns `{ status: "ok" }`
- [ ] Auth register/login flow works

## Role Journey Smoke
- [ ] Admin can review and moderate pending agents/listings
- [ ] Agent can submit application, create listing, respond to inquiry, update tours
- [ ] User can filter listings, save favorites, send inquiries, request tours, view/send thread messages

## Demo Artifacts
- [ ] `docs/demo-runbook.md` reviewed and current
- [ ] `docs/openapi.yaml` updated for any newly added routes
