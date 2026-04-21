Project Rules

File Responsibility
repository.ts   Prisma queries only
service.ts      Business logic only. No req/res. No Prisma instantiation.
controller.ts   HTTP only. Validate → call service → return response.
container.ts    Wiring only. No logic.
schema.ts       Zod schemas only.
routes/         Import container. Register routes. Nothing else.

Module Pattern
typescriptexport class AuthContainer {
  public readonly authRepository: AuthRepository
  public readonly authService: AuthService
  public readonly authController: AuthController

  constructor(prisma: PrismaClient, redis: RedisClientType, ses: SESClient) {
    this.authRepository = new AuthRepository(prisma)
    this.authService    = new AuthService(this.authRepository, redis, ses)
    this.authController = new AuthController(this.authService)
  }
}
Route file creates the container, uses the controller. That is it.

Cross-Module Rule
Service needs data from another module
  → Inject that module's repository via constructor in the container
  → Never import another service

Cross-module gating
  → Middleware only (requireKyc, requireFactFinding, requireAdmin)
  → Never in service logic

Prisma Rules
typescript// Always select only needed fields
prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })

// Always paginate findMany
prisma.user.findMany({ where, take: limit, skip: offset, orderBy })

// Use findUnique not findFirst when field is @unique
prisma.user.findUnique({ where: { email } })

// Use upsert for one-per-user tables
prisma.incomeProfile.upsert({ where: { userId }, create: {...}, update: {...} })

// Multi-step writes in transaction
prisma.$transaction(async (tx) => { ... })

// Soft delete only — never hard delete users
prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })

// Always filter soft-deleted records
prisma.user.findMany({ where: { deletedAt: null, isActive: true } })

Error Handling
Express 5 catches async errors automatically.
No try/catch in controllers or services.

Services    throw AppError subclasses
            throw new NotFoundError('User not found')
            throw new BadRequestError('Invalid OTP')
            throw new ForbiddenError('Account deactivated')

Middleware  handles everything in one place
            AppError → error.statusCode
            Prisma P2002 → 409
            Prisma P2025 → 404
            Unknown → 500 with generic message, never internals

Exception   Redis — try/catch is correct here
            Redis failure must fall through to DB silently

Security Rules
Never log: password, otp, aadhaar number, pan, tokens, api keys
Never return: passwordHash, raw errors, stack traces, internals
Never store: full Aadhaar number (last 4 only)
Never trust: user-supplied IDs for ownership — always use req.user.id from JWT
Always scope: every DB query to req.user.id
Always validate: req.body with Zod before calling service
Always rate limit: /auth/send-otp · /auth/login · /auth/verify-otp
Store JWT: httpOnly + Secure + SameSite=Strict cookies only

Response Shape — Always This, Never Different
typescript// Success
{ success: true, data: {...}, meta?: { total, page, limit } }

// Validation error
{ success: false, errors: { field: ['message'] } }

// Application error
{ success: false, message: 'Clear user-facing message' }

Naming
Files       kebab-case        auth.service.ts
Classes     PascalCase        AuthService
Methods     camelCase         sendOtp
DB tables   snake_case        user_profiles
DB columns  snake_case        created_at
Routes      kebab-case        /kyc/verify-otp
Redis keys  colon-separated   rec:{userId} · otp:{email}
Env vars    UPPER_SNAKE       AWS_REGION

Forbidden
❌ console.log anywhere
❌ any type in TypeScript
❌ Prisma outside repository files
❌ Business logic in controllers
❌ HTTP code (req/res) in services
❌ Services importing other services
❌ findMany without take and skip
❌ findFirst when findUnique is correct
❌ Storing full Aadhaar number
❌ Logging sensitive values
❌ Stack traces or internals returned to client
❌ Hard deleting user records
❌ process.env used directly in module files — import from config/env.ts
❌ req.body used without Zod validation first
❌ Different response shapes across endpoints