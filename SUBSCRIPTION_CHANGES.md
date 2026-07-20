# Subscription tier system — what actually changed

The old model charged a flat one-time fee to unlock **each individual**
candidate's contact details (Razorpay checkout per candidate). That's been
replaced with an **account-level subscription** (Free / Monthly ₹999 /
Yearly ₹8999) that governs how many engineers a company (or hiring
candidate) can view/hire, and how many times a Free candidate can save
their profile.

## How it works now

- **Free** — browse and search normally. Candidates can save their profile
  **once**. Contacts stay locked; no hiring.
- **Monthly (₹999)** — unlimited profile edits, contact details unlocked,
  up to **10 hires/month**.
- **Yearly (₹8999)** — same as Monthly, **unlimited hires**.

On login, a company/candidate on the Free plan sees a 3-plan popup once per
session (`DashboardLayout.jsx`). It can also be reopened any time from the
new **Subscription** page in the sidebar, or from the "Unlock Contact"
button on a candidate profile if the account isn't eligible.

Upgrading still goes through Razorpay (same gateway, same checkout script)
— the difference is the payment buys a subscription cycle, not a single
candidate's contact.

## Backend

| File | What it does |
|---|---|
| `backend/src/constants/plans.js` | **New.** Plan IDs, prices, durations, `hireLimit`, `profileEditLimit`. |
| `backend/src/models/plugins/authFields.js` | Added a `subscription` subdocument (plan/status/dates/usage) — applies to both `Candidate` and `Company` since they share this plugin. |
| `backend/src/controllers/subscriptionController.js` | **New.** `getPlans`, `getStatus`, `createSubscriptionOrder`, `verifySubscriptionPayment`, `cancelSubscription`, plus `ensureSubscriptionFresh` (auto-downgrades an expired paid plan back to Free on read). |
| `backend/src/routes/subscriptionRoutes.js` | **New.** Mounted at `/api/v1/subscription`. |
| `backend/src/controllers/candidateController.js` | Added `unlockCandidateContact` (`POST /candidates/:id/unlock`) — subscription-gated, replaces the Razorpay-per-candidate flow. `updateMyProfile` now enforces the Free-plan one-edit limit (the initial `hourlyRate`-only save from `HourlyRatePrompt` is exempt so it doesn't burn that edit). |
| `backend/src/routes/candidateRoutes.js` | Mounts the new unlock route. |
| `backend/src/routes/paymentRoutes.js` | Removed `POST /payments/order` (the old per-candidate unlock order). `POST /payments/order/work` and `/verify` are untouched — those pay an engineer for **completed work**, a separate concern from platform access. |
| `backend/src/server.js` | Mounts `subscriptionRoutes`. |
| `backend/src/constants/messages.js` | Added a `SUBSCRIPTION` message block. |

`paymentController.createPaymentOrder`'s old unlock logic is left in place
but unused (no route calls it) rather than deleted, in case you want to
diff against it.

## Frontend

| File | What it does |
|---|---|
| `frontend/src/utils/constants.js` | Added `PLAN_IDS` / `SUBSCRIPTION_PLANS` (mirrors the backend plan list for instant UI render). |
| `frontend/src/services/subscriptionService.js` | **New.** API client for the endpoints above. |
| `frontend/src/services/candidateService.js` | Added `unlockContact(id)`. |
| `frontend/src/components/common/SubscriptionModal.jsx` + `.css` | **New.** The 3-tier picker, with Razorpay checkout wired up for Monthly/Yearly. Reused everywhere a paywall needs to prompt an upgrade. |
| `frontend/src/components/layout/DashboardLayout.jsx` | Shows `SubscriptionModal` once per login session for Free-plan candidates/companies (same pattern as the existing `HourlyRatePrompt`). Added a "Subscription" sidebar link for both dashboards. |
| `frontend/src/pages/Subscription/SubscriptionPage.jsx` + `.css` | **New.** Shows current plan, usage (hires/edits used), renewal date; buttons to upgrade or cancel back to Free. Routed at `/candidate/dashboard/subscription` and `/company/dashboard/subscription`. |
| `frontend/src/pages/CandidateDetails/CandidateDetails.jsx` | "Unlock Contact" now calls the subscription-gated endpoint instead of opening Razorpay directly; a 402 response opens `SubscriptionModal` instead. |
| `frontend/src/components/common/CandidateCard.jsx` | Browse-grid card CTA now says "Unlock contact with a subscription" instead of quoting a per-candidate fee. |
| `frontend/src/App.jsx` | Routes for the new Subscription page. |

## Not done in this pass (flagging honestly)

- Admin visibility into subscribers (who's on which plan, MRR, etc.) — not
  built. Would live in `AdminDashboard`.
- Downgrade Monthly → Yearly proration, or "cancel effective at period end"
  instead of immediate — `cancelSubscription` currently drops to Free
  immediately.
- Email/notification on renewal or expiry.
- `backend/.env` needs `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (same vars
  the old flow used) plus optional `SUBSCRIPTION_MONTHLY_PRICE` /
  `SUBSCRIPTION_YEARLY_PRICE` overrides.
