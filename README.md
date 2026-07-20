# HourlyRecruit

> Hire Skilled Freelancers by the Hour

HourlyRecruit is a freelance marketplace SaaS platform where **companies** search for
**candidates (freelancers)**, view their profiles, and pay the platform to unlock
verified contact details. HourlyRecruit does **not** manage projects, contracts, or
in-app messaging in Version 1 — all work is negotiated and delivered outside the
platform. Revenue is generated purely from **contact unlock** transactions.

```
Company → Search Freelancer → View Profile → Pay Platform → Unlock Contact → Contact Freelancer Externally
```

## Monorepo Layout

```
hourlyrecruit/
├── backend/          Node.js / Express / MongoDB REST API
├── frontend/         React 19 + Vite SPA
├── docs/             Architecture & API documentation
├── package.json      Root workspace scripts
└── README.md
```

## Tech Stack

| Layer          | Technology                                             |
|----------------|---------------------------------------------------------|
| Frontend       | React 19, Vite, React Router DOM, Axios, Context API, React Hook Form, Pure CSS, React Icons |
| Backend        | Node.js, Express.js, Mongoose, JWT, bcrypt, Multer, express-validator, Morgan |
| Database       | MongoDB Atlas                                            |
| File Storage   | Cloudinary (resumes, images, logos, certificates)        |
| Payments       | Razorpay                                                 |
| Deployment     | Vercel (frontend) · Render (backend) · MongoDB Atlas (DB)|

## User Roles

1. **Admin** — platform operations, revenue, moderation
2. **Candidate** — freelancer who builds a profile and gets discovered
3. **Company** — client who searches, pays, and unlocks contact details

A single `users` collection handles authentication for all roles; `candidates` and
`companies` collections hold role-specific profile data, linked via `userId`.

## Development Roadmap

This project is being built module-by-module. Each module is completed, reviewed,
and confirmed before the next begins.

| # | Module | Status |
|---|--------|--------|
| 1 | Project Setup | ✅ Complete |
| 2 | Backend Setup | ✅ Complete |
| 3 | MongoDB Models | ✅ Complete |
| 4 | Cloudinary Integration | ✅ Complete |
| 5 | Authentication | ✅ Complete |
| 6 | Candidate Module | ✅ Complete |
| 7 | Company Module | ✅ Complete |
| 8 | Admin Module | ✅ Complete |
| 9 | Upload Module | ✅ Complete |
| 10 | Search Module | ✅ Complete |
| 11 | Payment Module | ✅ Complete |
| 12 | Notifications | ✅ Complete |
| 13 | Frontend Setup | ✅ Complete |
| 14 | Candidate Dashboard | ✅ Complete |
| 15 | Company Dashboard | ✅ Complete |
| 16 | Admin Dashboard | ✅ Complete |
| 17 | Landing Page | ✅ Complete |
| 18 | Testing | ⬜ Manual QA checklist in `docs/DEPLOYMENT.md` |
| 19 | Deployment | ⬜ See `docs/DEPLOYMENT.md` — ready to deploy |

See `docs/ARCHITECTURE.md` for design rationale and `docs/DEPLOYMENT.md` for
step-by-step Render/Vercel/MongoDB Atlas/Cloudinary/Razorpay setup.

## Getting Started (once modules are complete)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## License

Proprietary — All rights reserved.
