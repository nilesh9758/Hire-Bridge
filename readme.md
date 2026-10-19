# HireBridge

HireBridge is a web platform architected using the **MERN stack (MongoDB, Express.js, React, Node.js)**, designed to streamline placement interactions between recruiters and students, with the placement cell overseeing every step. The platform enhances efficiency by automating processes and reducing manual work.

## Features

- **Seamless Company-Student Interaction:** Facilitates **one-to-many** connections for placement opportunities.
- **Admin Panel:** Provides end-to-end process monitoring, resulting in a **50% reduction in manual workload** through **process optimization and automation**.
- **Scalable System:** Efficiently handles over **100+ concurrent users**.
- **Optimized Performance:** Utilizes **constant time (O(1)) CRUD operations** powered by **MongoDB's indexing and sharding capabilities**.
- **Event-Driven Architecture:** Leverages **asynchronous I/O operations** and **event loops** to manage real-time updates.

## Roles and Workflow

- **Admin** (no sign-up; created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/server/.env` on first start, or with `npm run seed:admin`)
  - Approves new student and recruiter accounts; nobody can use the portal until approved
  - Disables / re-enables accounts and reviews "enable my profile" requests from disabled users
  - Views every job posting with its applicants and can remove any posting
  - Tracks placements: each student's stage (In Progress / Selected / Placed / Rejected) with the company
  - Posts notices for students, recruiters, or both
- **Recruiter**: posts openings, views applicants and their resumes, shortlists, schedules interviews (the student is emailed the time and link), and marks candidates selected or rejected
- **Student**: completes the profile, uploads a PDF resume, sees all openings with eligibility (batch, branch, CGPA, deadline), applies only when eligible, accepts interviews, and accepts or declines offers

Application lifecycle: `applied -> shortlisted -> interview_scheduled -> interview_accepted -> selected -> offer_accepted | offer_declined` (the recruiter can reject at any point before the offer is answered).

### Email

Interview invitations and decisions are emailed with Nodemailer. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `.env` for real delivery (for Gmail use an App Password). If `SMTP_HOST` is empty, emails go to a free [Ethereal](https://ethereal.email) test inbox and the recruiter's screen shows a "view test email" link.

Uploaded resumes (PDF, up to 4 MB) are stored on [Cloudinary](https://cloudinary.com) as private files: they have no public link, and the API streams each one only to the student, the recruiter they applied to, or an admin. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env`.

## Security

- Auth tokens live only in `httpOnly`, `SameSite=Strict` cookies (never in the response body or `localStorage`). Set `COOKIE_SAMESITE=none` with HTTPS only if the frontend and API are on different sites.
- The frontend asks the server who is signed in (`GET /api/auth/me`); nothing in the browser is trusted for access decisions. Every portal area is role-guarded, and forbidden or unknown URLs fall back to the login page with an explanation.
- Tabs share one session: signing in or out in one tab updates the others, and a tab never keeps showing the previous user's data.
- The API checks the role and resource ownership on every request, so a recruiter can only see their own drives and applicants, and a student only their own data and resume. Disabled accounts are blocked on their next request.
- Security headers (helmet), rate limiting on login, registration and account actions, removal of `$`/dotted keys from request data (NoSQL injection), request size limits, password rules (8+ characters with a letter and a number), and generic 500 errors.

## Scaling

The API is stateless: sessions live in cookies, resumes on Cloudinary, and (with Redis) the cache and rate-limit counters in Redis. You can run as many API instances as you need behind a load balancer or on serverless. Every piece below is optional: without `REDIS_URL` the app runs exactly as before.

| Piece | What it does | Enable with |
| --- | --- | --- |
| **Redis cache** | Caches the account looked up on every authenticated request (60s), the open-jobs list shared by all students (60s) and notices (5 min). Mongoose hooks clear entries on every write, so approving/disabling accounts, posting jobs and notices show up immediately. | `REDIS_URL` |
| **Shared rate limits** | Login/registration limits are counted in Redis, so they hold across all instances (in-memory counters reset per instance, which on serverless makes them nearly useless). Falls back to in-memory counting if Redis goes down. | `REDIS_URL` |
| **Email queue (BullMQ)** | Interview invites and decisions are queued and sent by a separate worker with 5 retries and exponential backoff. API requests no longer wait on SMTP, and the worker updates the "Email sent" status on the application. | `REDIS_URL` + `QUEUE_EMAILS=true` + `npm run worker` |
| **Indexes** | MongoDB indexes for the hot queries (open jobs, a student's applications, recruiter stats, admin user lists). | always on |
| **Health check** | `GET /api/health` reports MongoDB and Redis status (503 when degraded), for load balancers and container probes. | always on |

If Redis becomes unreachable, requests skip it straight away (no timeouts): reads go to MongoDB, emails are sent inline, and the app reconnects automatically.

**On Vercel:** add a managed Redis such as [Upstash](https://upstash.com) (`REDIS_URL=rediss://...`) for caching and shared rate limits. Keep `QUEUE_EMAILS=false`, because Vercel can't run the long-lived worker.

**With Docker** (website, API, email worker and Redis; MongoDB comes from `MONGODB_URI`, e.g. Atlas):
```bash
cp server/server/.env.example server/server/.env   # set MONGODB_URI and the token secrets
docker compose up --build -d                       # site on http://localhost:8080
docker compose up -d --scale worker=3              # more email workers
docker compose down                                # stop everything
```
Inside Docker, Redis runs in its own container with the email queue switched on (`REDIS_URL` and `QUEUE_EMAILS` in `.env` are overridden), and nginx serves the site and forwards `/api` to the API.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Cache, rate limits and queues:** Redis, BullMQ (optional)
- **Version Control:** Git

## Setup Instructions

1. Clone the repository:
```bash
git clone <your-repo-url> hirebridge
cd hirebridge
```
2. Configure the backend environment:
```bash
cd server/server
cp .env.example .env   # then set MONGODB_URI and the token secrets
```
3. Install dependencies:
```bash
# Backend
cd server/server
npm install

# Frontend
cd client/client
npm install
```
4. Start the backend (API on http://localhost:3000, the frontend expects this port):
```bash
cd server/server
npm start
```
5. Start the frontend:
```bash
cd client/client
npm run dev
```
6. Open the application at:
```
http://localhost:5173
```
7. Optional: start Redis (e.g. `docker run -p 6379:6379 redis:7-alpine`), set `REDIS_URL=redis://127.0.0.1:6379` and, for the email queue, `QUEUE_EMAILS=true`, then run the worker in another terminal:
```bash
cd server/server
npm run worker
```
