# LIU Leave

Professor leave management system for Lebanese International University.

## Stack

- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS + shadcn/ui**
- **Prisma ORM + PostgreSQL** (Supabase)
- **Auth.js v5** with Google OAuth

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase connection string (port 6543, pgbouncer=true) |
| `DIRECT_URL` | Supabase direct URL (port 5432, for migrations) |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `ADMIN_BOOTSTRAP_EMAIL` | Your @liu.edu.lb email — gets ADMIN role on first login |

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

### 4. Push schema and seed database

```bash
npm run db:push
npm run db:seed
```

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your `@liu.edu.lb` Google account.

## Features

### Professor
- Submit leave requests with a multi-date picker (up to 22 days)
- One request per academic year (Sep 1 – Aug 31)
- View request status and admin comments

### Admin
- **Submissions**: Review all requests, filter by campus/status, approve or reject with comments
- **Statistics**:
  - Full-year calendar heatmap (leave density per day)
  - Per-campus breakdown (total days, busiest month, overlap count)
  - Per-professor table
  - Overlap alerts (days with 3+ professors from same campus on leave)
- **Users**: Promote/demote roles, cannot demote yourself

## Admin Access

Set `ADMIN_BOOTSTRAP_EMAIL` to your email. On first Google sign-in, the system automatically grants you the ADMIN role.
