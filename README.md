# LIU Leave

A leave management system for Lebanese International University professors.
Professors submit their annual leave days, and admins review, approve, or reject requests with full stats and overlap visibility.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js v5 — Google OAuth restricted to `@liu.edu.lb`
- **Hosting:** Vercel (app) + Supabase (database)

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- A [Google Cloud Console](https://console.cloud.google.com) account

---

## 1. Clone the Repository

```bash
git clone https://github.com/Moayad717/LIU-Leave.git
cd LIU-Leave
npm install
```

---

## 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, click **Connect** (top of dashboard)
3. Go to the **Direct** tab — copy the connection string (this is your `DIRECT_URL`)
4. Go to the **Transaction pooler** tab — copy that connection string (this is your `DATABASE_URL`)
   - Append `?pgbouncer=true&connection_limit=1` to the `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` in both with your Supabase project password

---

## 3. Set Up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. `LIU-Leave`)
3. Search for **Google Auth Platform** → click **Get Started**
4. Fill in app name, support email, set audience to **External**
5. Go to **Clients** → **Create Client**
   - Application type: **Web application**
   - Authorised JavaScript origins:
     - `http://localhost:3000`
     - `https://your-vercel-url.vercel.app`
   - Authorised redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-vercel-url.vercel.app/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**

---

## 4. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-x-xx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"

NEXTAUTH_SECRET=""        # run: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

ADMIN_BOOTSTRAP_EMAIL=""  # the first admin's email — bypasses @liu.edu.lb check on first login
```

---

## 5. Set Up the Database

```bash
npx prisma db push
npm run seed
```

The seed loads 9 campuses, 6 departments, and default app settings. No user or leave data is created — the system starts completely clean.

---

## 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your Google account.

On first login, the email matching `ADMIN_BOOTSTRAP_EMAIL` is automatically granted admin role. All other `@liu.edu.lb` accounts get professor role by default.

---

## 7. Deploy to Vercel

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Before deploying, expand **Environment Variables** and add all vars from your `.env`
   - Set `NEXTAUTH_URL` to your Vercel domain (e.g. `https://liu-leave.vercel.app`)
4. Click **Deploy**

After deploy, go back to Google Cloud Console and make sure your Vercel URL is added to the authorised redirect URIs.

---

## 8. Admin Access

- The email set in `ADMIN_BOOTSTRAP_EMAIL` is automatically granted admin role on first login
- That admin can promote other users to admin from the **Users** page in the admin panel
- An admin cannot demote themselves (lockout prevention)

---

## Features

**Professor**
- Sign in with a `@liu.edu.lb` Google account
- Select campus and department on first login (onboarding)
- Update campus and department anytime from the Profile page
- Submit leave days for the current academic year (Sep 1 – Aug 31)
- One submission per academic year — cannot resubmit after submitting
- View request status and admin comment

**Admin**
- Command center dashboard with KPIs, pending reviews, this week's absences, and overlap alerts
- View all submissions with filters: year, campus, status, and professor name search
- Open each submission to see a conflict analysis — which requested dates would cause campus or department-level overlap alerts, and who is already absent on those days
- Approve or reject with an optional comment (comment required on rejection)
- Statistics dashboard:
  - Full-year calendar heatmap by leave density
  - Per-campus breakdown with overlap counts, expandable by day with professor names
  - Per-professor table of approved leave days
  - Year filter to browse previous academic years
- Manage app settings: open/close submissions, max leave days per professor, campus and department overlap alert thresholds, and public holidays
- Promote or demote users between professor and admin roles

---

## Project Structure

```
liu-leave/
├── app/
│   ├── auth/
│   │   ├── signin/           # Sign-in page
│   │   └── error/            # Auth error page
│   ├── (protected)/
│   │   ├── layout.tsx        # Auth guard + nav
│   │   ├── dashboard/        # Professor dashboard
│   │   ├── onboarding/       # Campus + department selection on first login
│   │   ├── profile/          # Update campus + department
│   │   └── admin/
│   │       ├── page.tsx      # Command center
│   │       ├── submissions/  # Leave request management + conflict analysis
│   │       ├── stats/        # Analytics dashboard
│   │       ├── users/        # Role management
│   │       └── settings/     # App settings + holidays
│   └── api/auth/             # NextAuth routes
├── actions/                  # Server actions (leave, admin, settings, profile)
├── components/               # UI components
├── lib/
│   ├── auth.ts               # NextAuth config + domain restriction
│   ├── db.ts                 # Prisma client
│   └── academic-year.ts      # Academic year helpers
├── prisma/
│   ├── schema.prisma
│   └── seed.ts               # Campuses, departments, default settings
└── .env.example
```

---

## Support

For issues with setup, check:
- **Supabase connection:** make sure you're using the **Transaction pooler** URL for `DATABASE_URL` and the **Direct** URL for `DIRECT_URL`
- **Google OAuth:** make sure both localhost and production URLs are in the authorised redirect URIs
- **Admin access:** make sure `ADMIN_BOOTSTRAP_EMAIL` exactly matches the Google account email (case-sensitive)
