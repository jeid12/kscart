# KasiCart — MVP

Instant "Quick-Store" generator for WhatsApp-based vendors in Kigali. Vendors
create a shareable storefront in minutes; customers browse, send the order on
WhatsApp, and pay with MTN MoMo via a one-tap USSD code.

KasiCart **does not process payments** — it only assembles the correct WhatsApp
order message and the correct MoMo dial string and hands them off to the
customer's own apps (per the SRS).

## Architecture

```
kscart/
├── backend/     Node.js + Express REST API, PostgreSQL
└── frontend/    Next.js (App Router) mobile-first web app
```

- **Multi-vendor accounts** — each vendor registers and signs in with their
  phone number + password (JWT auth); every request is scoped to that vendor.
- **Catalog management** — add / edit / delete / hide items with **photo
  uploads to Cloudinary**.
- **Public storefront** — no login; cart with instant client-side totals.
- **Checkout hand-off** — pre-filled `wa.me` order message + `tel:` MoMo USSD
  string, with a copy-able fallback.
- **Sharing** — copy link, QR code, and WhatsApp share.

## Prerequisites

- Node.js 18+ (tested on Node 24)
- PostgreSQL 13+

If you don't have PostgreSQL, the quickest option is Docker:

```bash
docker run --name kasicart-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kasicart -p 5432:5432 -d postgres:16
```

Or on macOS with Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb kasicart
```

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # adjust DATABASE_URL if needed
npm run db:init             # creates the tables
npm run dev                 # starts on http://localhost:4000
```

Key environment variables (`backend/.env`):

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `PORT`               | API port (default `4000`)                               |
| `DATABASE_URL`       | PostgreSQL connection string (Neon works out of the box) |
| `CORS_ORIGIN`        | Allowed frontend origin (default `http://localhost:3000`) |
| `MOMO_USSD_TEMPLATE` | MoMo dial template, `{code}` + `{amount}` placeholders   |
| `JWT_SECRET`         | Secret for signing auth tokens (use a long random value) |
| `JWT_EXPIRES_IN`     | Token lifetime (default `30d`)                          |
| `CLOUDINARY_URL`     | Cloudinary credentials for image uploads                |
| `CLOUDINARY_FOLDER`  | Upload folder name (default `kasicart`)                 |

### Cloudinary setup (required for photo uploads)

1. Create a free account at https://cloudinary.com.
2. On the dashboard, copy your **API Environment variable** — it looks like
   `cloudinary://123456789:abcdefg@your-cloud-name`.
3. Paste it as `CLOUDINARY_URL` in `backend/.env`.

Until this is set, the item form still works but the "Upload photo" button
returns a clear "not configured" message.

> The MoMo USSD syntax is isolated in one place (`MOMO_USSD_TEMPLATE` /
> `src/config.js`). Confirm the exact string against current MTN Rwanda merchant
> documentation and update it there if MTN changes it.

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL if backend isn't on :4000
npm run dev                 # starts on http://localhost:3000
```

## Using it

1. Open http://localhost:3000 → **Create your store** (register with phone +
   password).
2. You land on your **dashboard**. Add items (with photos) and copy your store
   link / QR.
3. Sign in again anytime at `/login`.
4. As a customer, open the public store link, add items, tap **View order**,
   then send the WhatsApp order and pay with MoMo.

## API overview

| Method | Endpoint                       | Auth   | Purpose                        |
| ------ | ------------------------------ | ------ | ------------------------------ |
| POST   | `/api/auth/register`           | —      | Create a vendor account        |
| POST   | `/api/auth/login`              | —      | Sign in (phone + password)     |
| GET    | `/api/auth/me`                 | JWT    | Current vendor                 |
| GET    | `/api/vendors/me`              | JWT    | Dashboard data (vendor+items)  |
| PUT    | `/api/vendors/me`              | JWT    | Update store details           |
| POST   | `/api/items`                   | JWT    | Add an item                    |
| PUT    | `/api/items/:id`               | JWT    | Edit / toggle an item          |
| DELETE | `/api/items/:id`               | JWT    | Delete an item                 |
| POST   | `/api/uploads`                 | JWT    | Upload an item image (multipart) |
| GET    | `/api/stores/:slug`            | —      | Public storefront              |
| POST   | `/api/stores/:slug/checkout`   | —      | Build WhatsApp + MoMo hand-off |

`JWT` auth: send the login/registration token as `Authorization: Bearer <jwt>`.
Passwords are hashed with bcrypt; only the hash is stored.

## Deployment

The app is deployed as two pieces: the **backend on Render** and the
**frontend on Vercel**, both pointing at the same Neon database.

### Backend → Render

Option A — Blueprint (uses the included `render.yaml`):

1. Push your code to GitHub (already done).
2. Render dashboard → **New + → Blueprint** → select this repo. Render detects
   `render.yaml` and creates the `kasicart-backend` web service.
3. When prompted, fill in the secret env vars:
   - `DATABASE_URL` — your Neon connection string.
   - `JWT_SECRET` — a long random string (`openssl rand -hex 32`).
   - `CLOUDINARY_URL` — from your Cloudinary dashboard.
   - `CORS_ORIGIN` — your Vercel URL (add it after the frontend is deployed).
4. Deploy. Your API is at `https://kasicart-backend.onrender.com`.

Option B — Manual: **New + → Web Service** → connect repo → set
**Root Directory** `backend`, **Build Command** `npm install`, **Start Command**
`npm start`, **Health Check Path** `/api/health`, then add the same env vars.

> The schema is already applied to Neon. For a brand-new database, run
> `npm run db:init` once (locally with that `DATABASE_URL`, or via Render Shell).

### Frontend → Vercel

1. Vercel dashboard → **Add New → Project** → import this repo.
2. Set **Root Directory** to `frontend` (framework auto-detects as Next.js).
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g.
     `https://kasicart-backend.onrender.com`).
4. Deploy. Your app is at `https://<your-project>.vercel.app`.

### Connect the two (CORS)

After the frontend is live, set `CORS_ORIGIN` on Render to the Vercel URL and
redeploy the backend. To also allow Vercel preview deployments, use a
comma-separated list, e.g.
`https://kscart.vercel.app,https://kscart-git-main-you.vercel.app`.

> Note: Render's free tier sleeps after inactivity, so the first request after
> idle can take ~30–60s to wake up.

## MVP scope notes (from the SRS)

Included: multi-vendor accounts (phone + password login), catalog with
Cloudinary photo uploads, storefront, cart + totals, WhatsApp message, MoMo USSD
trigger, link/QR sharing.

Out of scope for v1.0: in-app payments/escrow, delivery, multi-vendor
marketplace, non-MTN providers, SMS/OTP verification (password auth is used
instead), password reset, and full Kinyarwanda/English UI translation (language
is captured per store but the interface currently ships in English).
