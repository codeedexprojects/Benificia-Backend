Benificia

Indian web platform. Users complete a financial profile and receive AI-generated insurance and investment recommendations. Three sides: users, AI service (separate developer), admin panel.
Phase: MVP · 30-day sprint · ship only what is listed

Repositories
benificia-api/   Node.js + Express + TypeScript
benificia-web/   React + Vite + TypeScript
Two separate repos. Not a monorepo.

Tech Stack
Frontend    React 18 + Vite + TypeScript
            Tailwind CSS + shadcn/ui + Recharts
            Zustand + React Query + React Hook Form + Zod

Backend     Node.js + Express 5 + TypeScript
            Prisma 5 + PostgreSQL
            Redis  + Zod

AWS         SES — email OTP and notifications
            S3  — KYC documents and profile photos

KYC         Surepass API — Aadhaar OTP eKYC (fully automatic)



User Journey
Gate 1 — Register
  email → OTP via AWS SES → password → JWT issued

Gate 2 — KYC (right after registration)
  Aadhaar number → OTP → Surepass verifies → profile auto-filled
  User adds: marital status, dependents, occupation, employer, income type
  KYC is 100% automatic. No manual review. No admin action.

Gate 3 — Fact Finding (on first financial service click)
  Income → Expenses → Assets/Liabilities → Goals → Risk profile (5 questions)
  Each step saves independently. User resumes on return.
  On completion → backend sends payload to AI → stores response

profileStage tracks position. On every login redirect user to correct screen.

AI Integration
Separate developer owns the AI server.
Your backend is the proxy — send data, receive response, store it.
You write zero recommendation logic.

Flow:
  1. Fetch user data from PostgreSQL
  2. Fetch active tie-up companies + products from PostgreSQL
  3. Build payload — user data + tieupCompanies context
  4. POST to AI server
  5. Validate response with Zod
  6. Store in ai_recommendations table
  7. Cache in Redis (key: rec:{userId}, TTL: 24h)
  8. Serve to user

Cache invalidation:
  User updates financial data → clear Redis + mark DB stale
  Admin changes companies or products → clear ALL user caches

Database — 21 Tables
Auth        users · auth_sessions · otp_logs
KYC         user_profiles · kyc_consents · kyc_audit_logs
Finance     income_profiles · expense_profiles · asset_liability_profiles
            financial_goals · risk_profiles
Insurance   insurance_companies · tieup_audit_logs
            insurance_products · insurance_interests
AI          ai_recommendations · recommendation_products
Admin       admin_users · admin_audit_logs
            scoring_configs · notification_templates
All PKs are UUID. Soft delete on users only (deleted_at). All user relations cascade delete.

Backend Structure
src/
  container.ts          global infrastructure instances
  app.ts                express setup + route mounting
  server.ts             starts server

  routes/
    user/
      index.ts          mounts at /api/v1
      auth.routes.ts
      kyc.routes.ts
      user.routes.ts
      finance.routes.ts
      insurance.routes.ts
      investment.routes.ts
      recommendation.routes.ts
    admin/
      index.ts          mounts at /api/v1/admin
      users.routes.ts
      kyc.routes.ts
      companies.routes.ts
      products.routes.ts
      recommendations.routes.ts
      scoring.routes.ts
      templates.routes.ts
      analytics.routes.ts

  modules/
    auth/               repository · service · controller · container · schema
    kyc/
    user/
    finance/
    insurance/
    investment/
    recommendation/
    admin/

  middleware/
    auth.middleware.ts
    admin.middleware.ts
    kyc.middleware.ts
    factFinding.middleware.ts
    error.middleware.ts
    rateLimit.middleware.ts

  config/               env.ts · constants.ts
  utils/                otp · jwt · encryption · email · s3 · response · errors

API Structure
/api/v1/auth/...
/api/v1/kyc/...
/api/v1/profile
/api/v1/finance/...
/api/v1/insurance/...
/api/v1/investment/...
/api/v1/recommendations/...

/api/v1/admin/users/...
/api/v1/admin/kyc/...
/api/v1/admin/companies/...
/api/v1/admin/products/...
/api/v1/admin/recommendations/...
/api/v1/admin/scoring/...
/api/v1/admin/templates/...
/api/v1/admin/analytics/...