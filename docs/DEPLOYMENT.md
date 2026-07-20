# Deployment Guide

## 1. MongoDB Atlas

1. Create a free/shared cluster at https://cloud.mongodb.com.
2. Create a database user and allow network access from `0.0.0.0/0` (or Render's
   static IPs, if you've enabled that add-on).
3. Copy the connection string into `backend/.env` as `MONGO_URI`.

## 2. Cloudinary

1. Create a free account at https://cloudinary.com.
2. On the Dashboard home page, copy your **Cloud Name**, **API Key**, and
   **API Secret** into `backend/.env` (`CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
3. No bucket or storage setup is required — `config/cloudinary.js`
   configures the SDK from those three values at runtime.

## 3. Razorpay

1. Create an account at https://dashboard.razorpay.com and switch to Test Mode.
2. Settings → API Keys → Generate Test Key. Copy `Key ID` / `Key Secret` into
   `backend/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and the frontend's
   `frontend/.env` (`VITE_RAZORPAY_KEY_ID`).
3. Go live later by switching to Live Mode keys — no code changes needed.

## 4. Backend on Render

1. Push this repo to GitHub/GitLab.
2. Render → New → Web Service → connect the repo, root directory `backend/`.
3. Build command: `npm install`   ·   Start command: `npm start`
4. Add all variables from `backend/.env.example` under Render's Environment tab.
   Set `CLIENT_URL` to your deployed Vercel frontend URL (added after step 5)
   and `NODE_ENV=production`.
5. Deploy. Confirm `GET https://<your-render-app>.onrender.com/api/v1/health`
   returns `{ "success": true, ... }`.

## 5. Frontend on Vercel

1. Vercel → New Project → import the repo, root directory `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output dir: `dist`.
3. Add environment variables from `frontend/.env.example`:
   - `VITE_API_BASE_URL=https://<your-render-app>.onrender.com/api/v1`
   - `VITE_RAZORPAY_KEY_ID=<your Razorpay key id>`
4. Deploy, then go back to Render and set `CLIENT_URL` to this Vercel URL so
   CORS and the refresh-token cookie's `sameSite`/origin checks work correctly.

## 6. Post-deploy checklist

- [ ] Register a candidate and a company account; confirm login/refresh works.
- [ ] Complete a candidate profile and confirm it appears in `/browse`.
- [ ] As a company, unlock a contact with a Razorpay **test card**
      (`4111 1111 1111 1111`, any future expiry, any CVV) and confirm the
      contact details render on the candidate page afterward.
- [ ] Confirm a notification was created for the candidate on unlock.
- [ ] Log in as an admin (see "Creating the first admin" below) and confirm
      the dashboard stats and payment list populate.
- [ ] Set Razorpay to Live Mode keys only once the above is verified in Test Mode.

## 7. Creating the first admin

There is no public "become an admin" flow by design — admins live in their
own separate `Admin` collection with no public registration endpoint. Run
the included seed script once, from the `backend/` directory, with your
`MONGO_URI` already set in `.env`:

```bash
node src/utils/seed.js --name "Jane Admin" --email admin@hourlyrecruit.com --password Str0ngPass123
```

This creates one Admin document directly (password is bcrypt-hashed by the
model's `pre('save')` hook, same as any other account). Log in at
`/login/admin` on the frontend with those credentials.

## 8. Scaling notes

- Add MongoDB indexes are already defined in the models (`Candidate` has a
  text index for search plus filter indexes) — no extra setup needed for
  moderate traffic.
- Razorpay webhooks (optional hardening): configure a webhook for
  `payment.captured` pointing at a new backend route that cross-checks
  `Payment.status`, to catch cases where the client closes the browser before
  the `handler` callback in `CandidateDetails.jsx` fires.
- Cloudinary assets are uploaded as public delivery URLs by default, so
  download links work without signed-URL expiry logic — reasonable for a V1,
  but consider switching to Cloudinary's signed/authenticated delivery if
  resumes/documents need tighter access control later.
