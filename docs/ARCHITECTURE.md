# HourlyRecruit — Architecture Overview

## 1. High-Level Architecture

```
┌─────────────┐      HTTPS/JSON       ┌──────────────┐        ┌────────────────┐
│   Frontend  │ ───────────────────▶  │   Backend    │ ─────▶ │  MongoDB Atlas │
│ React+Vite  │ ◀───────────────────  │ Express API  │        └────────────────┘
│  (Vercel)   │                       │  (Render)    │ ─────▶ ┌────────────────┐
└─────────────┘                       │              │        │   Cloudinary   │
                                       │              │ ─────▶ └────────────────┘
                                       │              │        ┌────────────────┐
                                       └──────────────┘ ─────▶ │    Razorpay    │
                                                                └────────────────┘
```

- **Frontend** never talks to MongoDB, Cloudinary, or Razorpay directly — everything
  goes through the Express API, which is the single source of truth and the only
  service holding credentials/secrets.
- **Cloudinary** holds all binary assets (resumes, profile images, logos,
  certificates). MongoDB only ever stores the resulting delivery URL string.
- **Razorpay** order creation and signature verification happen server-side only.

## 2. MVC + Service Layer Pattern (Backend)

```
Route → Middleware (auth/role/validation) → Controller → Service → Model → MongoDB
                                                   │
                                                   ▼
                                         External services
                                     (Cloudinary, Razorpay, Email)
```

- **Routes**: declare endpoints + attach middleware, no business logic.
- **Controllers**: parse request, call services/models, shape `ApiResponse`.
- **Services**: reusable business logic (e.g. `cloudinaryService`, `jwtService`) that
  controllers and other services can share — keeps controllers thin.
- **Models**: Mongoose schemas — the only layer aware of MongoDB structure.
- **Middleware**: auth (JWT verification), role-based authorization, centralized
  error handling, file upload (Multer) handling.
- **Validators**: `express-validator` chains per-route, isolated from controllers.

## 3. Database Design Summary

**Candidates, Companies, and Admins are three separate top-level collections
— there is no shared `users` table.** Each role owns its own authentication
fields (name, email, password, status, tokenVersion, etc. — added via a
shared `authFieldsPlugin`) directly on its own profile document. A
candidate's login credentials and profile live in the same `candidates`
document; same for companies and admins. This avoids mixing fundamentally
different account types into one collection and means each role's document
shape only ever contains fields relevant to that role.

| Collection            | Purpose                                                    | Key Relationships |
|------------------------|-------------------------------------------------------------|--------------------|
| `candidates`           | Freelancer identity (auth) + profile data, one document     | referenced by payments/reviews/contact_unlocks |
| `companies`            | Client/company identity (auth) + profile data, one document | referenced by payments/reviews/contact_unlocks |
| `admins`               | Admin identity (auth) only — no public registration          | — |
| `payments`             | Razorpay transaction records                                 | `companyId` → companies, `candidateId` → candidates |
| `reviews`               | Company → Candidate ratings post-engagement                 | `companyId` → companies, `candidateId` → candidates |
| `notifications`        | In-app notifications per user                                | `userId` + `userModel` (dynamic ref via `refPath`) |
| `categories`           | Freelancer category taxonomy                                 | referenced by skills |
| `skills`                | Master skill list for tagging/search                        | referenced by candidates (by name, not FK) |
| `verification_requests`| Admin verification workflow for candidates/companies         | `profileId` + `role` (dynamic ref via `refPath`) |
| `contact_unlocks`      | Record of every unlock event (source of truth for access)   | `companyId`, `candidateId`, `paymentId` |

**Why not one shared `users` collection?**
Candidates and companies are different kinds of accounts with almost no
field overlap (a candidate has `hourlyRate`/`skills`; a company has
`companyName`/`gstNumber`), different search/index requirements (candidates
need a text index for search; companies don't), and no scenario where the
app queries "all users regardless of role" as a single homogeneous set — the
admin dashboard's "all users" view is a merge of three targeted queries
instead, which is cheaper than filtering one large mixed collection by
`role` on every query. Email uniqueness across the whole platform is
enforced at the application level (`utils/findAccountByEmail.js` checks all
three collections before allowing a new registration).

**Why `refPath` for `notifications.userId` and `verification_requests.profileId`?**
These two collections need to point at whichever of Candidate/Company/Admin
actually owns the record. Mongoose's dynamic `refPath` lets a single
ObjectId field resolve to different models based on a sibling `userModel`/
`role` field, so `.populate()` still works without needing three separate
optional foreign-key fields.

**Why a dedicated `contact_unlocks` collection instead of a boolean flag?**
It gives an auditable, queryable history of every unlock (for admin
reporting, disputes, and re-unlock logic) rather than overwriting state on
a single document.

## 4. API Conventions

- Base path: `/api/v1/...`
- Consistent envelope for every response:

```json
{
  "success": true,
  "message": "Candidate profile updated",
  "data": { },
  "errors": []
}
```

- Errors use the same envelope with `success: false` and a populated `errors[]`
  array, thrown via a centralized `ApiError` class and caught in `errorMiddleware`.
- Auth: JWT access token (short-lived, ~15m) + refresh token (httpOnly cookie,
  longer-lived). Role-based route guards via `roleMiddleware(['company'])` etc.

## 5. Security Baseline

- `helmet` for HTTP headers, `express-rate-limit` on auth & payment routes.
- `express-validator` on every mutating route; `express-mongo-sanitize` against
  NoSQL injection; `xss-clean` style sanitization on free-text fields.
- Passwords hashed with `bcrypt` (cost factor 12), never returned in API responses
  (`select: false` on schema field).
- All secrets (Mongo URI, JWT secrets, Cloudinary API credentials, Razorpay keys)
  loaded via `dotenv` from `.env`, never committed (`.gitignore`).
- Razorpay payment signature is verified server-side before any `contact_unlocks`
  document is created — the frontend can never unlock contact info directly.

## 6. Coding Standards

- ES6+, `async/await` everywhere (no unhandled promise chains).
- SOLID principles; controllers/services do one job each.
- No duplicate logic — shared logic lives in `utils/` or `services/`.
- Every exported function documented with JSDoc-style comments.
- Consistent naming: `camelCase` for variables/functions, `PascalCase` for models
  and React components, `kebab-case` for CSS files.
