/**
 * One-off script to seed fake reviews so candidate/company profiles show
 * realistic ratings and review text in dev/demo instead of the flat
 * default of 4 stars with 0 reviews.
 *
 * Tops every existing Candidate up to at least 3 company-authored reviews,
 * and every existing Company up to at least 3 candidate-authored reviews —
 * counting whatever reviews already exist first, and only adding as many
 * new ones as needed to reach the target (default 3, override with
 * --target). Existing reviews are left untouched. Since there's exactly
 * one review per (candidate, company, reviewerType) pair, the max reviews
 * a candidate can ever have is capped by how many companies exist (and
 * vice versa).
 *
 * After seeding, it recalculates rating/reviewsCount on every
 * Candidate/Company from the actual Review documents — the same math the
 * real review flow uses (reviewController's recalculate*Rating) — so what
 * you see is always derived from real data, never a cosmetic overwrite.
 *
 * Safe to re-run: won't create a review where one already exists for that
 * pair/side, and stops topping up once a profile is at the target.
 *
 * Usage (from backend/):
 *   node src/utils/seedFakeReviews.js
 *   node src/utils/seedFakeReviews.js --target 5
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const Review = require('../models/Review');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  return parsed;
};

const COMPANY_ON_CANDIDATE_COMMENTS = [
  'Great communication and delivered exactly what we needed, on time.',
  'Solid engineer — picked up the codebase fast and shipped clean PRs.',
  'Would definitely hire again. Very responsive and reliable.',
  'Good work overall, a couple of minor delays but quality was there.',
  'Excellent problem solver, went above and beyond on edge cases.',
  'Professional and easy to work with throughout the engagement.',
];

const CANDIDATE_ON_COMPANY_COMMENTS = [
  'Clear requirements and paid on time. Smooth engagement.',
  'Great team to work with, very responsive to questions.',
  'Good experience overall, would work with them again.',
  'Payment was prompt and expectations were reasonable.',
  'Communicative team, gave useful feedback during the project.',
];

// Skewed toward 4-5 so it reads as realistic rather than random noise.
const RATING_POOL = [3, 4, 4, 4, 5, 5, 5, 5];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

const recalculateCandidateRating = async (candidateId) => {
  const stats = await Review.aggregate([
    { $match: { candidateId, reviewerType: 'company' } },
    { $group: { _id: '$candidateId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 4;
  const count = stats.length ? stats[0].count : 0;
  await Candidate.findByIdAndUpdate(candidateId, { rating: avgRating, reviewsCount: count });
};

const recalculateCompanyRating = async (companyId) => {
  const stats = await Review.aggregate([
    { $match: { companyId, reviewerType: 'candidate' } },
    { $group: { _id: '$companyId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avgRating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 4;
  const count = stats.length ? stats[0].count : 0;
  await Company.findByIdAndUpdate(companyId, { rating: avgRating, reviewsCount: count });
};

/** Tops up one candidate to `target` company-authored reviews about them. */
const topUpCandidate = async (candidate, companies, target, stats) => {
  const existing = await Review.find({ candidateId: candidate._id, reviewerType: 'company' }).select('companyId');
  const usedCompanyIds = new Set(existing.map((r) => String(r.companyId)));
  let count = existing.length;
  if (count >= target) return;

  const available = shuffled(companies.filter((co) => !usedCompanyIds.has(String(co._id))));
  for (const company of available) {
    if (count >= target) break;
    await Review.create({
      candidateId: candidate._id,
      companyId: company._id,
      reviewerType: 'company',
      rating: pick(RATING_POOL),
      review: pick(COMPANY_ON_CANDIDATE_COMMENTS),
    });
    count += 1;
    stats.created += 1;
  }
  if (count < target) {
    stats.shortfalls.push(`Candidate "${candidate.name}" only has ${count}/${target} reviews — not enough companies in the DB to pair with.`);
  }
};

/** Tops up one company to `target` candidate-authored reviews about them. */
const topUpCompany = async (company, candidates, target, stats) => {
  const existing = await Review.find({ companyId: company._id, reviewerType: 'candidate' }).select('candidateId');
  const usedCandidateIds = new Set(existing.map((r) => String(r.candidateId)));
  let count = existing.length;
  if (count >= target) return;

  const available = shuffled(candidates.filter((c) => !usedCandidateIds.has(String(c._id))));
  for (const candidate of available) {
    if (count >= target) break;
    await Review.create({
      candidateId: candidate._id,
      companyId: company._id,
      reviewerType: 'candidate',
      rating: pick(RATING_POOL),
      review: pick(CANDIDATE_ON_COMPANY_COMMENTS),
    });
    count += 1;
    stats.created += 1;
  }
  if (count < target) {
    stats.shortfalls.push(`Company "${company.companyName}" only has ${count}/${target} reviews — not enough candidates in the DB to pair with.`);
  }
};

const run = async () => {
  const { target = 3 } = parseArgs();
  const targetCount = Number(target);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[SeedReviews] Connected to MongoDB');
  console.log(`[SeedReviews] Target database: ${mongoose.connection.name}`);
  console.log(`[SeedReviews] Topping every profile up to ${targetCount} reviews`);

  const candidates = await Candidate.find({});
  const companies = await Company.find({});

  if (!candidates.length || !companies.length) {
    console.log('[SeedReviews] Need at least one Candidate and one Company in the DB. Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const stats = { created: 0, shortfalls: [] };

  for (const candidate of candidates) {
    await topUpCandidate(candidate, companies, targetCount, stats);
  }
  for (const company of companies) {
    await topUpCompany(company, candidates, targetCount, stats);
  }

  console.log(`[SeedReviews] Created ${stats.created} new review(s)`);
  if (stats.shortfalls.length) {
    console.log('[SeedReviews] Some profiles could not reach the target (not enough counterpart accounts to pair with):');
    stats.shortfalls.forEach((msg) => console.log(`  - ${msg}`));
  }

  for (const c of candidates) await recalculateCandidateRating(c._id);
  for (const co of companies) await recalculateCompanyRating(co._id);

  console.log('[SeedReviews] Ratings recalculated for all candidates and companies');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('[SeedReviews] Failed:', err);
  process.exit(1);
});
