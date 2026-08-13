# KodBell

A full-stack mentor/tutoring scheduler. Students search for mentors by name or subject, browse their availability calendar, and submit a session request with their contact info and what they need help with. Mentors manage their own topics, availability, incoming requests, and session ratings.

## Tech stack
- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt password hashing

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

**If you already ran the original `schema.sql`** and are updating an existing database, also run `server/db/migration_001.sql` in DBeaver against your `kodbell` database — it adds the contact-info fields to bookings.

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
1. Sign up as a **mentor** — pick topics you can help with, add a couple of availability slots.
2. Sign up as a **student** (separate browser tab or incognito window) — search or filter for a mentor by name/subject, pick an open slot, and submit a session request with your name, email, phone (optional), and what you need help with.
3. Back in the mentor tab, you'll see the request with the student's contact info and reason — mark the session complete once it happens.
4. Back in the student tab, leave a 1-5 rating — it now shows up in that mentor's average rating.

## What to highlight in your application
- **End-to-end ownership:** you scoped the schema, auth, booking-conflict handling (row locking to prevent double-booking), and the search/filter logic yourself.
- **Directly tied to your CodePath mentoring experience** — this isn't a hypothetical, it mirrors the office-hours/mentoring workflow you already run.
- **What you'd do differently:** worth having 1-2 honest answers ready — e.g. no real-time notifications yet, no calendar sync (Google Calendar), ratings aren't tied to specific topics.

## Possible extensions if you have more time
- Email/SMS reminders before a session
- Google Calendar sync for mentor availability
- Per-topic rating breakdowns
- Waitlist for fully booked mentors
