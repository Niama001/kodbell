# KodBell

[![CI](https://github.com/Niama001/kodbell/actions/workflows/ci.yml/badge.svg)](https://github.com/Niama001/kodbell/actions/workflows/ci.yml)

A full-stack mentor/tutoring scheduler. Students search for mentors by name or subject, browse their availability calendar, and submit a session request with their contact info and what they need help with. Mentors manage their own topics, availability, incoming requests, and session ratings.

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
- **CI:** GitHub Actions

## Setup (VS Code)

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

## Continuous integration
Every push and pull request to `main` runs a GitHub Actions workflow (`.github/workflows/ci.yml`) with two parallel jobs:
- **frontend:** installs dependencies and builds the React app
- **backend:** installs dependencies, syntax-checks every server file, then starts the server and calls `/api/health` as a smoke test

## Known limitations
- No automated tests yet, so CI covers build, syntax, and startup only
- No real-time notifications
- No calendar sync (Google Calendar)
- Ratings are not tied to specific topics

## Possible extensions
- Backend tests for auth and booking logic
- Email/SMS reminders before a session
- Google Calendar sync for mentor availability
- Per-topic rating breakdowns
- Waitlist for fully booked mentors