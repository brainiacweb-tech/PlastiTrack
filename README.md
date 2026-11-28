# PlastiTrack

PlastiTrack is a browser-based demonstration platform for smart-bin monitoring, collection coordination, recovered-plastic inventory, and environmental reporting. All supplied users, bin readings, locations, and activity are simulated; no physical IoT hardware is connected.

## Run the demo

Requirements: Node.js 20.19+ (or 22.12+) and npm.

1. Install workspace dependencies with `npm install`.
2. Start the browser demo with `npm run dev`.
3. Open `http://localhost:5173` and choose any demo account on the sign-in page.

No PostgreSQL, API server, environment file, or database setup is needed to sign in or explore the demo workflows.

All six role accounts use the password `PlastiTrack!2026`:

- `admin@plastitrack.demo`
- `partner@plastitrack.demo`
- `collector@plastitrack.demo`
- `recycler@plastitrack.demo`
- `manager@plastitrack.demo`
- `officer@plastitrack.demo`

Demo activity is saved in this browser's local storage. It is not shared with other browsers or devices. The administrator can restore the starter scenario from the Guided demonstration page. A completed collection creates recovered-plastic inventory; the recycling company can request it, and the administrator can progress the request.

## GitHub Pages demo

The browser-only demo is deployed at <https://brainiacweb-tech.github.io/PlastiTrack/>. Pushes to `main` build and deploy the client with GitHub Actions. Demo data remains in each visitor's browser; the optional Express/Prisma API is not deployed to GitHub Pages.

## Vercel deployment

Import this repository into Vercel and leave the project root set to the repository root. The root `vercel.json` builds the client workspace, publishes `client/dist`, and routes app deep links to the SPA entry point. No environment variables or database are needed for the browser-only demo. Git pushes to the connected repository can trigger Vercel deployments.

This configuration deploys the browser demo only. The optional Express/Prisma API and PostgreSQL database are not deployed to Vercel by this setup and need a separate hosting configuration if required.

## Optional API development

The Express/Prisma API is retained as a separate development component; the browser demo does not depend on it. Running the API requires PostgreSQL 15+, environment configuration, and database migrations:

1. Create a PostgreSQL database named `plastitrack`.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, a unique `JWT_SECRET` (at least 32 characters), and a separate `DEVICE_INGEST_TOKEN`.
3. Generate the Prisma client, apply migrations, and seed the demo accounts:

   ```powershell
   npm run demo:setup
   ```

4. Start the API separately with `npm run dev:api`. Check `http://localhost:4000/api/v1/health` for database readiness.

The API reset endpoint requires `DEMO_MODE=true`. Never reuse example secrets outside a local demo.

## Architecture and delivery plan

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the architecture, data relationships, RBAC outline, device integration boundary, modules, and implementation status.

## Demonstration boundaries

- Browser demo authentication and role-specific access are for evaluation only; they are not production security.
- Demo state is stored locally in the browser and can be reset from the Guided demonstration page.
- The optional REST API uses Prisma/PostgreSQL and server-side JWT authorization; its setup is not required by the browser demo.
- Simulated readings carry the `SIMULATED` source label. The optional device ingestion endpoint is separate, authenticated by a device token, and records the `DEVICE` source.
- Demo site names and map coordinates are illustrative rather than claims about real collection infrastructure.
- CSV export is generated from local demo data; PDF output currently uses the browser print dialog.
- Full user-account/team administration, registration/invitation, damage and location collection-request workflows, and collection evidence uploads are not implemented yet.
- The bin map is an illustrative demonstration view, not a live geographic map.
- Email/SMS/WhatsApp notifications, live maps, physical devices, production hosting, and production-grade secrets provisioning are future integrations.
