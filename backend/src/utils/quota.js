/**
 * Rolling-window quota engine.
 *
 * A quota like { limit: 6, windowDays: 3 } means "at most 6 uses in any
 * trailing 3-day period" — not a calendar-aligned reset. To check that we
 * need to know the timestamp of every use still inside the window, so each
 * quota is backed by an array of Date timestamps (one per use) stored on
 * the account document, e.g.:
 *
 *   subscription.usage.jobApplications = [Date, Date, ...]
 *
 * This module is storage-agnostic: it operates on a plain array you pass
 * in and returns the pruned array for you to save back. It does not touch
 * the database itself — callers (controllers) own the read/save.
 *
 * Usage keys match constants/plans.js QUOTA_KEYS.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Drops timestamps that have fallen outside the window. Always call this
 * before checking/consuming so old entries don't keep counting forever.
 *
 * @param {Date[]} timestamps
 * @param {number} windowDays
 * @returns {Date[]} pruned, chronologically-sorted array
 */
const pruneToWindow = (timestamps = [], windowDays) => {
  if (!windowDays) return timestamps.slice();
  const cutoff = Date.now() - windowDays * DAY_MS;
  return timestamps.filter((t) => new Date(t).getTime() > cutoff).sort((a, b) => a - b);
};

/**
 * Checks whether one more use is allowed under a quota, without consuming
 * it. Use this for read-only "can they still do this" checks (e.g.
 * rendering remaining count in the UI).
 *
 * @param {Date[]} timestamps - existing usage timestamps (any order)
 * @param {{limit: number|null, windowDays: number|null}} quota
 * @returns {{ allowed: boolean, remaining: number|null, used: number,
 *             resetAt: Date|null, prunedTimestamps: Date[] }}
 */
const checkQuota = (timestamps, quota) => {
  if (!quota || quota.limit === null || quota.limit === undefined) {
    // Unlimited.
    return { allowed: true, remaining: null, used: 0, resetAt: null, prunedTimestamps: [] };
  }

  const pruned = pruneToWindow(timestamps, quota.windowDays);
  const used = pruned.length;
  const allowed = used < quota.limit;
  const remaining = Math.max(quota.limit - used, 0);
  // The window "resets" (frees up one slot) when the oldest still-counted
  // use ages out of the window.
  const resetAt =
    pruned.length > 0 ? new Date(new Date(pruned[0]).getTime() + quota.windowDays * DAY_MS) : null;

  return { allowed, remaining, used, resetAt, prunedTimestamps: pruned };
};

/**
 * Checks AND records a new use in one step. Callers should save
 * `prunedTimestamps` (which already includes the new use, if allowed) back
 * onto the document. If the quota is exceeded, the timestamps array is
 * still pruned (so stale entries get cleaned up) but the new use is NOT
 * added.
 *
 * @param {Date[]} timestamps
 * @param {{limit: number|null, windowDays: number|null}} quota
 * @returns {{ allowed: boolean, remaining: number|null, used: number,
 *             resetAt: Date|null, prunedTimestamps: Date[] }}
 */
const consumeQuota = (timestamps, quota) => {
  const result = checkQuota(timestamps, quota);
  if (!quota || quota.limit === null || quota.limit === undefined) {
    return result;
  }
  if (result.allowed) {
    const now = new Date();
    result.prunedTimestamps = [...result.prunedTimestamps, now];
    result.used += 1;
    result.remaining = Math.max(quota.limit - result.used, 0);
  }
  return result;
};

module.exports = { pruneToWindow, checkQuota, consumeQuota, DAY_MS };
