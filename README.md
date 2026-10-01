# Doctor Tracker

A simple, secure admin portal for managing doctors and patients. This project separates the API and frontend cleanly to keep hosting options flexible and the code easy to read.

## Elevator Pitch

Doctor Tracker helps small clinics/admins track who the doctors are, which patients belong to which doctor, and see basic analytics at a glance. It ships with a guarded admin portal, cookie-based auth, fast list filtering, and a production-ready build.

## Screenshots

### Desktop

![Login](docs/screenshots/01-login.png)
![Dashboard](docs/screenshots/02-dashboard.png)
![Doctors list](docs/screenshots/03-doctors.png)
![Doctors — search](docs/screenshots/04-doctors-search.png)
![Doctor detail](docs/screenshots/05-doctor-detail.png)
![Add patient modal](docs/screenshots/06-patient-form.png)
![Patients list](docs/screenshots/07-patients.png)
![Delete confirmation](docs/screenshots/08-delete-confirm.png)

### Mobile (responsive)

![Mobile login](docs/screenshots/09-mobile-login.png)
![Mobile dashboard](docs/screenshots/10-mobile-dashboard.png)
![Mobile doctors](docs/screenshots/11-mobile-doctors.png)
![Mobile doctor detail](docs/screenshots/12-mobile-doctor-detail.png)
![Mobile patients](docs/screenshots/13-mobile-patients.png)
![Mobile navigation drawer](docs/screenshots/14-mobile-menu.png)

## Features

- **Admin auth** — JWT in httpOnly cookie (`dt_token`), route guards on the web, and server-side protection on all `/api` resources.
- **Doctors** — CRUD, search (name/specialization/hospital/contact), filters (specialization, hospital, created date range), pagination, sort by name/createdAt.
- **Patients** — CRUD, assign to doctor, filters (status, gender, condition, age, doctor, visit date range, created date range), search (name/contact/condition), pagination, cascade delete on doctor removal (patients reassigned/handled per API rules).
- **Dashboard analytics** — total counts, patients by status, by gender, top conditions, patients per doctor (bar), doctor growth (12-month line), recent patients.
- **UX** — debounced search, shareable URL filters (back/forward works), mobile drawer, empty/loading/error states, validation errors surfaced clearly.
- **Performance & indexing** — MongoDB indexes for common filter/sort and search (`searchText` with multi-word AND matching).
- **Security** — rate limit on login, httpOnly SameSite cookie, Zod validation, input sanitization via schema, CORS configured for same-origin via Next.js rewrites.

## Tech Stack

**API (server)**
- [Express](https://expressjs.com/) + Node.js (v24.21.0)
- [Mongoose](https://mongoosejs.com/) 9.10.3 (MongoDB ODM)
- [MongoDB](https://www.mongodb.com/) (local via Docker `mongo:7`)
- [Zod](https://zod.dev/) for request validation
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken), [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- [cors](https://github.com/expressjs/cors), [cookie-parser](https://github.com/expressjs/cookie-parser), [helmet](https://github.com/helmetjs/helmet), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [dotenv](https://github.com/motdotla/dotenv)

**Web (frontend)**
- [Next.js](https://nextjs.org/) 16.3.8 (App Router, TypeScript)
- [React](https://react.dev/) 19.1.0
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Recharts](https://recharts.org/) 3.10.1
- [lucide-react](https://lucide.dev/) icons
- [clsx](https://github.com/lukeed/clsx)

## Architecture

- **Separation of concerns**: `server/` (REST API) and `web/` (Next.js app) are independent projects. 
- **API**: `http://localhost:5000/api/*` with cookie-based auth.
- **Frontend ↔ API**: Next.js [rewrites](web/next.config.ts) map `/api/:path*` to the backend (keeps same-origin in dev and avoids extra CORS friction). The `api.ts` client uses `credentials: 'include'` and follows redirects on 401 to `/login`.
- **Data model**: `User` (admin), `Doctor` (with denormalized `searchText` + indexes on specialization/hospital/name/createdAt), `Patient` (belongs to Doctor, `searchText` + indexes on doctor/status/gender/age/visitDate/createdAt).

## Project Structure

```text
doctor-tracker/
├── docs/screenshots/        # README screenshots
├── server/                  # Express REST API
│   ├── src/
│   │   ├── app.js            # Express app, middleware, routes
│   │   ├── config/          # env, DB connection
│   │   ├── controllers/      # auth/doctor/patient/stats
│   │   ├── middleware/       # auth, error, validators (Zod)
│   │   ├── models/           # Mongoose schemas + indexes + hooks
│   │   ├── routes/           # route definitions
│   │   ├── seed/             # DB seed script
│   │   ├── utils/            # ApiError, asyncHandler, query helpers
│   │   └── index.js          # server entry
│   ├── .env.example
│   └── package.json
└── web/                     # Next.js App Router frontend
    ├── src/
    │   ├── app/              # pages (login, (portal) routes)
    │   ├── components/       # UI, forms, shell, charts, modals
    │   ├── lib/              # api client, types, formatters, hooks
    │   └── globals.css
    ├── .env.example
    ├── next.config.ts
    └── package.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) v24.21.0+ (tested on 24.21.0)
- [npm](https://www.npmjs.com/) 11.19.0+
- [Docker](https://www.docker.com/) (recommended for MongoDB) — or a local MongoDB instance

## Setup

### 1) Start MongoDB (Docker)

```bash
docker run -d --name dt-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=doctor_tracker mongo:7
```

Check it’s running: `docker ps | grep dt-mongo`

### 2) API (server)

```bash
cd server
cp .env.example .env  # adjust if needed
npm install
# Seed database (creates admin + sample doctors/patients)
node src/seed/seed.js
# Start dev server
npm run dev
```

API will be available at `http://localhost:5000`. Health: `GET http://localhost:5000/api/health`.

Demo admin account (created by seed):
- Email: `admin@doctortracker.dev`
- Password: `Admin@123`

> Note: Change these in production.

### 3) Web (frontend)

```bash
cd web
cp .env.example .env  # defaults are fine for local dev
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`. Login with the demo account above.

## Environment Variables

**server/.env.example**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/doctor_tracker
JWT_SECRET=dev_secret_change_in_production_please_use_long_random_string
JWT_EXPIRES_IN=7d
COOKIE_NAME=dt_token
CLIENT_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=5
```

**web/.env.example**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

In dev, `next.config.ts` rewrites `/api/*` to `NEXT_PUBLIC_API_URL`, so the frontend can call relative `/api/...` endpoints. This keeps requests same-origin and cookies work seamlessly across localhost.

## API Reference (summary)

Auth:
- `POST /api/auth/login` — email+password, sets httpOnly `dt_token` cookie, returns user
- `DELETE /api/auth/logout` — clears cookie
- `GET /api/auth/me` — returns current user (requires auth)

Doctors (`/api/doctors`, all require auth):
- `GET /` — list with `search`, `specialization`, `hospital`, `from`, `to` (created range), `sort`, `page`, `limit`
- `POST /` — create (name, specialization, hospital, phone, email)
- `GET /:id` — fetch by ID (includes patients)
- `PATCH /:id` — update fields
- `DELETE /:id` — delete doctor; related patients are handled/cascade in line with the spec (implemented server-side)

Patients (`/api/patients`, require auth):
- `GET /` — list with `search`, `doctor`, `status` (stable/critical/recovered), `gender` (male/female/other), `condition`, `minAge`, `maxAge`, `visitFrom`, `visitTo`, `from`, `to`, `sort`, `page`, `limit`
- `POST /` — create (name, age, gender, phone, email, condition, status, visitDate, doctorId)
- `GET /:id` — fetch by ID
- `PATCH /:id` — update fields
- `DELETE /:id` — delete

Stats (`/api/stats`, require auth):
- `GET /overview` — totals, by status/gender, top conditions, recent patients, patients per doctor, doctor growth (12 months)

Validation uses Zod (`server/src/middleware/validators.js`). Query parsing/pagination/sorting/date ranges live in `server/src/utils/query.js`.

## Testing, Linting, Typecheck & Build

**Server** (from `server/`):
```bash
npm run dev      # nodemon
npm start        # node src/index.js
```

**Web** (from `web/`):
```bash
npm run dev       # Next dev (Turbopack)
npm run build     # production build (passes)
npm run start     # start production server
npm run lint      # ESLint (Next.js config) — clean
npm run typecheck # TypeScript tsc --noEmit — clean
```

All verified: TypeScript clean, ESLint clean, `next build` succeeds (static + dynamic routes compiled). API verified with curl (auth, CRUD, filters, pagination, dashboard, cascade/delete, validation, 401/404/400). UI end-to-end verified with Puppeteer across desktop/mobile flows.

## Technical Decisions

- **Mongoose 9.10.3** — upgraded from 8.24.4 to fix Node 24 compatibility issues (pre-save hooks hanging on `create()` in the older version). Also uses `returnDocument: 'after'` for `findByIdAndUpdate` and `this` semantics in hooks.
- **Denormalized `searchText`** — doctors/patients store a lowercased concatenation of searchable fields; bulk inserts (`insertMany`) populate it in `pre('insertMany')`. Search uses `$all` with case-insensitive per-word regexes for multi-word AND matching and index-backed scans.
- **Indexes** — targeted compound/simple indexes on doctors (`specialization`, `hospital`, `name`, `createdAt`), patients (`doctor`, `status`, `gender`, `age`, `visitDate`, `createdAt`) to keep filter+sort+pagination fast.
- **Query layer** — single helpers build Mongo filters/sort/pagination from query params with safe coercion and date-range handling; Zod schemas validate body/query.
- **Cookie auth** — httpOnly SameSite cookie (`dt_token`) avoids storing tokens in localStorage; frontend uses `credentials: 'include'` and Next.js rewrites keep same-origin. Server enforces auth on all data routes.
- **Separation + rewrites** — separate apps make hosting flexible (e.g. Render/Railway for API, Vercel for web) and local dev simple with `/api/*` proxying to backend.
- **Simple, readable code** — small focused modules, no over-abstraction; comments kept minimal (code is self-explanatory). Components are composable and hooks encapsulate URL state + debouncing.

## Deployment Notes (not yet chosen)

The app is build-ready. Suggested split:
- **API (server)** — deploy to Render/Railway/Flightcontrol (set `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, etc.)
- **Web (frontend)** — deploy to Vercel/Cloudflare Pages/Netlify (set `NEXT_PUBLIC_API_URL` to the live API URL). In production, remove or adjust rewrites if API is on a different origin; ensure cookies work with correct `SameSite`/`Secure` settings and `CLIENT_ORIGIN` matches the frontend domain.

Before deploying, replace the dev `JWT_SECRET` with a strong random value and tighten CORS/origin settings.

## License

This project is provided as-is for educational/demo purposes. Feel free to adapt and extend it as needed.