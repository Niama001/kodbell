# KodBell

[![CI](https://github.com/Niama001/kodbell/actions/workflows/ci.yml/badge.svg)](https://github.com/Niama001/kodbell/actions/workflows/ci.yml)

A full-stack mentor/tutoring scheduler. Students search for mentors by name or subject, browse their availability calendar, and submit a session request with their contact info and what they need help with. Mentors manage their own topics, availability, incoming requests, and session ratings.

**Live demo:** https://kodbell-client.onrender.com

The demo runs on free hosting tiers, so the first load after a quiet period can take up to a minute while the server wakes up. Please use fake data (for example, `mentor@example.com`), because the demo database is public and may be reset.

## Features
- **Authentication and roles:** JWT login with bcrypt password hashing, and role-based access control that separates student and mentor accounts
- **Mentor search:** students search and filter mentors by name or subject
- **Availability and booking:** mentors publish time slots, and students request sessions with their contact info and what they need help with
- **Double-booking protection:** booking uses a database transaction with row locking (`SELECT ... FOR UPDATE`) so two students cannot claim the same slot
- **Ratings:** students leave a 1-5 rating after a completed session, and it feeds into the mentor's average rating

## Tech stack
- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt password hashing
- **Testing:** Node.js built-in test runner
- **Containers:** Docker, Docker Compose, nginx
- **CI/CD:** GitHub Actions
- **Hosting:** Render (Docker web service, static site, managed PostgreSQL)

## Run with Docker (recommended)
Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up --build
```

Then open `http://localhost:8080`. This starts three containers:
- **db:** PostgreSQL 16. On first start it creates all tables from `server/db/schema.sql`
- **server:** the Express API
- **client:** the built React app served by nginx, which also forwards `/api` requests to the server

Check that the API is up at `http://localhost:8080/api/health`.

Useful commands:
```bash
docker compose down        # stop the containers (database data is kept)
docker compose down -v     # stop and delete the database volume for a fresh start
```

The compose file ships with local-development defaults for the database password and JWT secret. To use your own, create a `.env` file in the repo root (it is git-ignored):
```
POSTGRES_PASSWORD=your_password
JWT_SECRET=a_long_random_string
```
Postgres sets its password only when the volume is first created, so run `docker compose down -v` after changing it.

## Setup without Docker (VS Code)

### 1. Database
Open DBeaver, connect to your local Postgres instance, and:
1. Create a new database called `kodbell`.
2. Open `server/db/schema.sql` and run it against that database. This creates all tables and seeds a starter list of topics.

### 2. Backend
```bash
cd server
npm install
cp .env.example .env
```
Edit `.env` with:
- Your Postgres credentials (matching what you use in DBeaver)
- A random string for `JWT_SECRET`

**If you already ran the original `schema.sql`** and are updating an existing database, also run `server/db/migration_001.sql` in DBeaver against your `kodbell` database. It adds the contact-info fields to bookings.

Then start it:
```bash
npm run dev
```
Server runs at `http://localhost:4000`.

### 3. Frontend
In a second terminal:
```bash
cd client
npm install
npm run dev
```
App runs at `http://localhost:5173` (Vite proxies `/api` calls to the backend automatically).

## How to demo it
1. Sign up as a **mentor**: pick topics you can help with, add a couple of availability slots.
2. Sign up as a **student** (separate browser tab or incognito window): search or filter for a mentor by name/subject, pick an open slot, and submit a session request with your name, email, phone (optional), and what you need help with.
3. Back in the mentor tab, you'll see the request with the student's contact info and reason. Mark the session complete once it happens.
4. Back in the student tab, leave a 1-5 rating. It now shows up in that mentor's average rating.

## Running the tests
```bash
cd server
npm install
npm test
```

The backend uses Node's built-in test runner, so there are no extra dependencies. The tests need no database and no `.env` file. They cover:
- **Unit tests** for the login and role checks (`requireAuth`, `requireRole`): missing, malformed, and forged tokens, and wrong roles
- **API tests** for requests that are rejected before reaching the database: unauthenticated or wrong-role booking and rating requests, missing booking fields, and out-of-range rating scores

## Continuous integration and deployment
Every push and pull request to `main` runs a GitHub Actions workflow (`.github/workflows/ci.yml`):
- **frontend:** installs dependencies and builds the React app
- **backend:** installs dependencies, syntax-checks every server file, runs the test suite, then starts the server and calls `/api/health` as a smoke test
- **docker:** builds both images, starts the full stack with Docker Compose, then checks through nginx that the API responds and the database was seeded
- **deploy:** runs only on `main`, and only after the three jobs above pass. It triggers a deployment of both services on Render, then waits until the live site responds

## Deployment
KodBell is hosted on [Render](https://render.com) as three pieces:
- **Database:** a managed PostgreSQL instance. The schema in `server/db/schema.sql` was loaded into it once
- **Server:** a Docker web service built from `server/Dockerfile`. Its database connection settings and `JWT_SECRET` are environment variables in Render, never in the repo
- **Client:** a static site built from `client/`. Two rewrite rules connect it to the server: `/api/*` is forwarded to the server, and every other path serves `index.html` so React Router pages work on refresh

Render's own auto-deploy is turned off. Deployments are triggered only by the `deploy` job in the CI workflow, through deploy hooks stored as GitHub Actions secrets (`RENDER_SERVER_DEPLOY_HOOK` and `RENDER_CLIENT_DEPLOY_HOOK`). A failed check anywhere in the pipeline means nothing is deployed.

## Known limitations
- Automated tests cover the auth middleware and request validation only. Routes that query the database (signup, login, booking, ratings) are not tested yet
- The demo runs on free hosting: the server sleeps when idle, and the free database is temporary, so the demo data can disappear
- The database schema is loaded by hand, with no automated migrations
- The `deploy` job confirms that the live site responds, but it does not verify which version is serving
- No real-time notifications
- No calendar sync (Google Calendar)
- Ratings are not tied to specific topics

## Possible extensions
- Integration tests against a test Postgres database (signup, duplicate email, double-booking returns 409)
- Automated database migrations as part of deployment
- Describe the Render setup as code (`render.yaml`)
- Email/SMS reminders before a session
- Google Calendar sync for mentor availability
- Per-topic rating breakdowns
- Waitlist for fully booked mentors