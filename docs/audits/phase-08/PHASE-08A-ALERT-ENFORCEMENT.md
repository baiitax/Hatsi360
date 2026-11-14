# Phase 08A Stage 3 — Alert Entitlement Enforcement

**Status:** ✅ Complete  
**Date:** 2026-11-15  
**Migration:** 0043_enforce_alert_entitlement.sql

## Overview

Stage 3 implements enforcement for the `alerts` entitlement at the database (RLS) and application levels. This ensures that only users with an active subscription including the `alerts` entitlement can create, modify, or delete price alerts.

## Implementation

### Database Changes

**Migration 0043** adds the following RLS policies to the `price_alerts` table:

1. **`price_alerts_select`** — Allows users to SELECT their own alerts regardless of entitlement status
   - Rationale: Users should be able to view their existing alerts even if their subscription expires
   - Prevents confusion and data loss perception

2. **`price_alerts_insert`** — Requires `alerts` entitlement OR staff role to INSERT
   - Prevents users without entitlement from creating new alerts
   - Staff users can always create alerts for support/testing

3. **`price_alerts_update`** — Requires `alerts` entitlement OR staff role to UPDATE
   - Prevents users without entitlement from modifying existing alerts
   - Includes reactivation of paused alerts

4. **`price_alerts_delete`** — Requires `alerts` entitlement OR staff role to DELETE
   - Prevents users without entitlement from deleting alerts
   - Preserves alert data for when subscription is renewed

The `alert_delivery_logs` table retains its existing ownership-based policy (logs can only be read by the alert owner or staff).

### Application-Level Changes

**Modified Files:**

1. **`src/app/(site)/trade/alerts/page.tsx`**
   - Added entitlement check using `hasEntitlement('alerts')`
   - Displays warning banner when user lacks entitlement:
     - Explains that alerts are paused
     - Clarifies that existing alerts are preserved
     - Provides link to `/pricing` for upgrade
   - Alert list remains visible (read access preserved)

2. **`src/app/(site)/dashboard/page.tsx`**
   - Added entitlement checks for `watchlists`, `alerts`, and `api`
   - Updated watchlists section:
     - Shows upgrade prompt instead of saved commodities/markets
     - Links to `/pricing` for upgrade
   - Updated alerts section:
     - Shows upgrade prompt instead of alert count
     - Links to `/pricing` for upgrade
   - Updated API applications section:
     - Shows upgrade prompt instead of API key list
     - Links to `/pricing` for upgrade
   - All queries now check entitlement before executing (defense in depth)

### Transition Policy

When a user loses the `alerts` entitlement (e.g., subscription expires):

✅ **What users CAN do:**
- View their existing alerts (SELECT allowed)
- See alert details (commodity, direction, threshold, status)
- Receive the upgrade prompt on the alerts page

❌ **What users CANNOT do:**
- Create new alerts (INSERT blocked)
- Modify existing alerts (UPDATE blocked)
- Delete alerts (DELETE blocked)
- Reactivate paused alerts (UPDATE blocked)

**Rationale:**
- Preserves user data — alerts are not deleted when subscription expires
- Reduces confusion — users can see their alerts and understand they're paused
- Encourages renewal — users can easily reactivate alerts by resubscribing
- Prevents data loss perception — users don't feel their alerts "disappeared"

### Background Jobs

**Current State:** No background jobs process alerts in the current implementation.

**Future Considerations:**
When implementing alert notification jobs:
- Jobs must check entitlement status before triggering notifications
- Recommended approach:
  ```sql
  SELECT a.* FROM price_alerts a
  JOIN customer_subscriptions s ON a.user_id = s.user_id
  WHERE a.is_active = true
    AND s.status = 'active'
    AND has_entitlement(s.user_id, 'alerts')
  ```
- This ensures only entitled users receive notifications

## Security Analysis

### Attack Vectors Tested

1. **Direct API manipulation** — Blocked by RLS policies
   - Attempted: POST to create alert without entitlement
   - Result: 403 Forbidden (RLS violation)

2. **Database direct access** — Blocked by RLS policies
   - Attempted: Direct SQL INSERT without entitlement
   - Result: New row violates row-level security policy

3. **Cross-user access** — Blocked by ownership check
   - Attempted: Read another user's alerts
   - Result: Returns 0 rows (RLS filters by user_id)

4. **Entitlement bypass** — Not possible
   - Entitlements are checked via `has_entitlement()` function
   - Function checks active subscription status
   - No way to bypass without valid subscription

### Data Isolation

✅ **Verified:**
- Users can only see their own alerts
- Users cannot access other users' alerts
- Staff users can access all alerts (for support)
- No cross-user data leakage

### Entitlement Enforcement

✅ **Verified:**
- INSERT operations require entitlement
- UPDATE operations require entitlement
- DELETE operations require entitlement
- SELECT operations allowed for all users (transition policy)

## Testing

### Test Coverage

**File:** `tests/phase-08a/alerts-entitlement.test.ts`

**Tests:**
- ✅ RLS policy enforcement (INSERT, UPDATE, DELETE)
- ✅ Cross-user access prevention
- ✅ Staff user bypass
- ✅ Transition policy (alerts preserved, modifications blocked)
- ✅ Application-level checks (warning banner, upgrade prompts)

**Test Results:**
- All tests pass
- No regressions in existing functionality
- Entitlement checks work as expected

### Manual Testing Checklist

- [x] User without entitlement sees warning banner on `/trade/alerts`
- [x] User without entitlement can view existing alerts
- [x] User without entitlement cannot create new alerts
- [x] User without entitlement cannot modify existing alerts
- [x] User without entitlement cannot delete alerts
- [x] User with entitlement can perform all operations
- [x] Staff users can bypass entitlement checks
- [x] Dashboard shows upgrade prompts for restricted features
- [x] Cross-user access is blocked

## Files Modified

### Database Migrations
- `supabase/migrations/0043_enforce_alert_entitlement.sql` — New migration

### Application Code
- `src/app/(site)/trade/alerts/page.tsx` — Added entitlement check and warning banner
- `src/app/(site)/dashboard/page.tsx` — Added entitlement checks for watchlists, alerts, and API

### Tests
- `tests/phase-08a/alerts-entitlement.test.ts` — Comprehensive test suite

### Documentation
- `docs/audits/phase-08/PHASE-08A-ALERT-ENFORCEMENT.md` — This document

## Verification Commands

### Check RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'price_alerts'
ORDER BY policyname;
```

### Check Entitlement Function

```sql
-- Test entitlement check for a user
SELECT has_entitlement('test-user-id', 'alerts');
```

### Verify Alert Access

```sql
-- As a user without entitlement
SET LOCAL ROLE 'authenticated';
SET request.jwt.claim.sub = 'test-user-id';

-- Should succeed (read access allowed)
SELECT * FROM price_alerts WHERE user_id = 'test-user-id';

-- Should fail (INSERT requires entitlement)
INSERT INTO price_alerts (user_id, commodity_id, direction, threshold_amount, channel)
VALUES ('test-user-id', 1, 'above', 1000, 'email');
```

## Comparison with Stage 2 (Watchlists)

| Aspect | Stage 2 (Watchlists) | Stage 3 (Alerts) |
|--------|---------------------|------------------|
| **SELECT policy** | Blocked without entitlement | Allowed without entitlement |
| **INSERT policy** | Blocked without entitlement | Blocked without entitlement |
| **UPDATE policy** | Blocked without entitlement | Blocked without entitlement |
| **DELETE policy** | Blocked without entitlement | Blocked without entitlement |
| **Transition policy** | Users see upgrade prompt, cannot view watchlists | Users see upgrade prompt, CAN view existing watchlists |
| **Rationale** | Watchlists are optional convenience feature | Alerts represent user investment (time setting thresholds) |

**Key Difference:**
- Watchlists: Complete access restriction (users cannot view saved items)
- Alerts: Read access preserved (users can view but not modify)

**Why the difference?**
- Alerts require more user effort to configure (thresholds, directions, channels)
- Users expect to see their configured alerts even if subscription lapses
- Reducing friction for resubscription by preserving alert data
- Alerts feel more "valuable" to users than simple watchlists

## Performance Impact

### Query Performance

**SELECT operations:** No change
- RLS policy checks are fast (simple user_id comparison)
- No additional joins required for SELECT

**INSERT/UPDATE/DELETE operations:** Minimal overhead
- `has_entitlement()` function is called once per operation
- Function uses indexed lookup on `customer_subscriptions`
- Estimated overhead: < 1ms per operation

### Application Performance

**Dashboard page:** Slightly improved
- Now checks entitlement before querying data
- Skips unnecessary queries for users without entitlement
- Reduces database load for non-entitled users

**Alerts page:** No change
- Entitlement check is fast (cached in session)
- Warning banner is lightweight

## Rollback Plan

If issues arise, rollback by:

1. **Revert database migration:**
   ```sql
   DROP POLICY IF EXISTS price_alerts_insert ON public.price_alerts;
   DROP POLICY IF EXISTS price_alerts_update ON public.price_alerts;
   DROP POLICY IF EXISTS price_alerts_delete ON public.price_alerts;
   
   -- Restore original SELECT policy
   CREATE POLICY price_alerts_select ON public.price_alerts
   FOR SELECT TO authenticated
   USING (user_id = auth.uid());
   ```

2. **Revert application changes:**
   ```bash
   git revert <commit-hash>
   ```

**Note:** Rollback is unlikely to be needed. The changes are additive (new policies) and non-destructive (no data modification).

## Next Steps

**Stage 4: Export Entitlement Enforcement**

- Add RLS policies for export operations
- Implement entitlement checks in export API endpoints
- Add application-level checks in export UI
- Define transition policy for in-progress exports

**Estimated Effort:** 2-3 days

## Appendix: Entitlement Resolution Order

When checking entitlements, the system evaluates in this order:

1. **Staff role check** — Staff users bypass all entitlement checks
2. **Subscription status check** — Subscription must be `active`
3. **Entitlement array check** — Subscription must include the entitlement
4. **Date range check** — Current date must be within subscription period

**Example:**
```sql
-- has_entitlement() function logic
SELECT EXISTS (
  SELECT 1 FROM customer_subscriptions
  WHERE user_id = $1
    AND status = 'active'
    AND entitlements @> '["alerts"]'
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date > NOW())
);
```

## References

- **Phase 08 Specification:** `/docs/audits/phase-08/PHASE-08-SPECIFICATION.md`
- **Stage 2 (Watchlists):** `/docs/audits/phase-08/PHASE-08A-WATCHLIST-ENFORCEMENT.md`
- **Migration 0016 (Entitlement Engine):** `/supabase/migrations/0016_commercial_entitlements.sql`
- **Migration 0043 (Alert Enforcement):** `/supabase/migrations/0043_enforce_alert_entitlement.sql`

---

**Stage 3 Status:** ✅ Complete  
**Ready for Stage 4:** ✅ Yes  
**Tests Passing:** ✅ Yes  
**Security Verified:** ✅ Yes
