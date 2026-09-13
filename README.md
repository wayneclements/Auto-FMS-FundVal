# Auto FMS FundVal

A TypeScript, React, and Postgres version of the original C# WinForms fund valuation workflow.

## What is included

- Vite React frontend for run sheet, environment, company, FundVal type, date, readiness, analyse, export, and import workflow controls.
- Fund Valuation Date on the main form is entered and displayed in `DD/MM/YYYY` format.
- A Process Details panel (opened via the NEXT button) summarizes the selected environment, company, Fund Valuation date, and FundVal type, and exposes the process/investment-group button grid.
- Process buttons turn light green on a successful run and red when the process fails or returns no result.
- An FMS terminal-automation layer (`src/ui/screens.ts`, `src/ui/actions.ts`, `src/ui/process.ts`) that incrementally ports the original C# WinForms process handlers (e.g. `processFMSD`, `processFMFVRM`, `processFMFV`, `processFMBAL`, `processFMPI`, `processFMPRD`, `processFMPID`, `processFMPFBBR`) screen-by-screen. Handlers not yet ported from the C# source remain as placeholder stubs.
- Express TypeScript API under `server/`.
- Postgres schema, migration, and seed scripts under `database/`.
- Vite proxy from `/api` to the local API server on port `5174`.
- Processing-log API support for recording process activity in Postgres.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create the local `testops_portal_db` database and `testops_portal` schema by running `database/setup-db.sql` as a Postgres administrator.

3. Copy `.env.example` to `.env` and update `DATABASE_URL` if needed.

4. Start the app:

   ```powershell
   npm run dev:all
   ```

The React app runs through Vite and the API listens on `http://localhost:5174`.
If `DATABASE_URL` is not configured, the API starts in demo mode with the same sample run sheet found in the seed script.

## Database Migrations

Run these migrations against `testops_portal_db` after the base `testops_portal` tables are available:

- `database/add-process-investment-group-status.sql` adds the `status` column to `testops_portal.process_investment_group`, assigns existing records an approximately 80/20 true/false distribution, and defaults future records to `true`.
- `database/create-fund-valuation-processing-log-table.sql` creates `testops_portal.fund_valuation_processing_log` for process activity messages.

The API exposes `POST /api/processing-log` for writing entries with an environment, company, Fund Valuation date, and message. The React-side helpers are in `src/ui/database.ts` and `src/ui/actions.ts`.

## Scripts

- `npm run dev` starts the React frontend.
- `npm run dev:api` starts the Express API.
- `npm run dev:all` starts frontend and API together.
- `npm run build` type-checks and builds the frontend.
- `npm run lint` runs Oxlint.

## Debugging

Use the VS Code **Debug UI** configuration to start Vite and launch Edge at `http://localhost:5173/`. Use **Attach to Edge** to launch Edge with remote debugging on port `9222` and attach to it. **Debug Full Stack** starts the UI and server debugger configurations together.
