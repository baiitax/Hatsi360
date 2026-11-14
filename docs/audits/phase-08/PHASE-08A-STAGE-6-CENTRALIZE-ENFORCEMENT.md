# Phase 08A - Stage 6: Centralize Enforcement

**Status:** ✅ COMPLETE  
**Date:** 2026-11-14  
**Module:** `src/lib/entitlements.ts`

---

## Executive Summary

Stage 6 centralizes the entitlement enforcement patterns into reusable helpers, making it easier to add entitlement checks consistently across the codebase. This stage does NOT change any existing functionality — it adds convenience helpers on top of the existing `getEntitlements()` and `hasEntitlement()` functions.

**Key Achievements:**
- ✅ Created `EntitlementError` class for clear error messages
- ✅ Created `requireEntitlement()` helper for fail-loud enforcement
- ✅ Created `checkEntitlement()` helper for conditional rendering
- ✅ Created `withEntitlement()` helper for conditional execution
- ✅ Created `ENTITLEMENT_LABELS` for UI display
- ✅ Created `ENTITLEMENT_MIN_TIER` for upgrade prompts
- ✅ Documented patterns and usage examples

---

## 1. New Helpers Added

### 1.1 EntitlementError Class

```typescript
export class EntitlementError extends Error {
  constructor(
    public readonly requiredKey: EntitlementKey,
    public readonly currentTier: EntitlementSet['tier'],
    message?: string,
  );
}
```

**Purpose:** Provides clear, structured error messages when a user lacks a required entitlement.

**Example Error:**
```
EntitlementError: This feature requires the 'alerts' entitlement. Your current tier is 'public'.
```

### 1.2 requireEntitlement()

```typescript
export async function requireEntitlement(
  key: EntitlementKey,
  options?: { message?: string },
): Promise<EntitlementSet>
```

**Purpose:** Fail-loud entitlement check. Throws `EntitlementError` if user lacks the entitlement.

**Use Case:** Server actions and API routes where missing entitlement should block execution.

**Example:**
```typescript
// In a server action:
export async function createAlert(formData: FormData) {
  // Throws EntitlementError if user doesn't have 'alerts'
  await requireEntitlement('alerts');
  
  // Continue with alert creation...
  const supabase = await createClient();
  await supabase.from('price_alerts').insert({...});
}
```

### 1.3 checkEntitlement()

```typescript
export async function checkEntitlement(
  key: EntitlementKey,
): Promise<{ hasIt: boolean; entitlements: EntitlementSet }>
```

**Purpose:** Non-blocking entitlement check for conditional rendering.

**Use Case:** Page components that want to show upgrade prompts instead of blocking.

**Example:**
```typescript
// In a page component:
export default async function WatchlistPage() {
  const { hasIt, entitlements } = await checkEntitlement('watchlists');
  
  if (!hasIt) {
    return (
      <UpgradePrompt
        feature="watchlists"
        currentTier={entitlements.tier}
        requiredTier="professional"
      />
    );
  }
  
  return <WatchlistUI />;
}
```

### 1.4 withEntitlement()

```typescript
export async function withEntitlement<T, F = null>(
  key: EntitlementKey,
  fn: (entitlements: EntitlementSet) => Promise<T>,
  options?: { fallback?: F },
): Promise<T | F>
```

**Purpose:** Execute a function only if user has the entitlement, otherwise return fallback.

**Use Case:** Conditional execution with graceful degradation.

**Example:**
```typescript
// In a server action:
export async function runExport() {
  const result = await withEntitlement(
    'exports',
    async (entitlements) => {
      return await generateExpensiveReport();
    },
    { fallback: { error: 'Upgrade to Professional to export reports' } }
  );
  
  if ('error' in result) {
    return result; // Return error to UI
  }
  
  return result; // Return report data
}
```

### 1.5 ENTITLEMENT_LABELS

```typescript
export const ENTITLEMENT_LABELS: Record<EntitlementKey, string> = {
  watchlists: 'Saved commodities & markets',
  alerts: 'Price alerts',
  exports: 'Report exports',
  reports: 'Premium reports',
  api: 'API access',
  bulk: 'Bulk data operations',
};
```

**Purpose:** Human-readable labels for UI display.

**Example:**
```typescript
import { ENTITLEMENT_LABELS } from '@/lib/entitlements';

<Alert>
  You need the {ENTITLEMENT_LABELS['alerts']} feature.
</Alert>
```

### 1.6 ENTITLEMENT_MIN_TIER

```typescript
export const ENTITLEMENT_MIN_TIER: Record<EntitlementKey, string> = {
  watchlists: 'Professional',
  alerts: 'Professional',
  exports: 'Professional',
  reports: 'Professional',
  api: 'Enterprise',
  bulk: 'Enterprise',
};
```

**Purpose:** Tell users which tier they need to upgrade to.

**Example:**
```typescript
import { ENTITLEMENT_MIN_TIER } from '@/lib/entitlements';

<Button>
  Upgrade to {ENTITLEMENT_MIN_TIER['alerts']} for price alerts
</Button>
```

---

## 2. Existing Patterns (Preserved)

### 2.1 Direct Check Pattern

**Already in use across the codebase:**

```typescript
const entitlements = await getEntitlements();
const hasWatchlists = hasEntitlement(entitlements, 'watchlists');
const hasAlerts = hasEntitlement(entitlements, 'alerts');
```

**When to use:** When checking multiple entitlements at once (e.g., dashboard page). This is more efficient than calling `checkEntitlement` multiple times.

### 2.2 API Handler Pattern

**Already in use in `src/lib/api/handler.ts`:**

```typescript
if (options.entitlement) {
  const hasEnt = auth.application.entitlementSet
    ? hasEntitlement(auth.application.entitlementSet, options.entitlement)
    : false;
  if (!hasEnt) {
    return errors.forbidden('This endpoint requires the ' + options.entitlement + ' entitlement.');
  }
}
```

**When to use:** API route handlers with entitlement-gated endpoints.

---

## 3. Pattern Selection Guide

| Scenario | Pattern | Example |
|----------|---------|---------|
| Check multiple entitlements | Direct check | Dashboard page |
| Block execution if missing | `requireEntitlement()` | Server action |
| Conditional rendering | `checkEntitlement()` | Page component |
| Conditional execution | `withEntitlement()` | Optional feature |
| API endpoint gating | API handler pattern | API routes |
| RLS enforcement | Database policy | All queries |

---

## 4. Migration Guide

### Before (verbose):

```typescript
import { getEntitlements, hasEntitlement } from '@/lib/entitlements';

export async function createAlert(formData: FormData) {
  const entitlements = await getEntitlements();
  if (!hasEntitlement(entitlements, 'alerts')) {
    throw new Error('You need the alerts entitlement to create alerts');
  }
  
  // Continue...
}
```

### After (concise):

```typescript
import { requireEntitlement } from '@/lib/entitlements';

export async function createAlert(formData: FormData) {
  await requireEntitlement('alerts');
  
  // Continue...
}
```

**Benefits:**
- ✅ Less boilerplate
- ✅ Consistent error messages
- ✅ Clear intent
- ✅ Type-safe

---

## 5. Files Modified

### `src/lib/entitlements.ts` (MODIFIED)

**Added:**
- `EntitlementError` class (lines ~195-210)
- `requireEntitlement()` function (lines ~212-230)
- `checkEntitlement()` function (lines ~232-250)
- `withEntitlement()` function (lines ~252-275)
- `ENTITLEMENT_LABELS` constant (lines ~277-285)
- `ENTITLEMENT_MIN_TIER` constant (lines ~287-295)

**Total additions:** ~100 lines

---

## 6. Backward Compatibility

**All existing code continues to work.** The new helpers are additive — they don't change any existing behavior.

**Existing patterns preserved:**
- `getEntitlements()` — unchanged
- `hasEntitlement()` — unchanged
- `getApplicationEntitlements()` — unchanged
- `rateLimitFor()` — unchanged
- `EMPTY_ENTITLEMENTS` — unchanged

---

## 7. Testing

### Manual Testing

```typescript
// Test requireEntitlement
import { requireEntitlement, EntitlementError } from '@/lib/entitlements';

try {
  await requireEntitlement('alerts');
} catch (e) {
  if (e instanceof EntitlementError) {
    console.log('Required:', e.requiredKey);
    console.log('Current tier:', e.currentTier);
  }
}

// Test checkEntitlement
import { checkEntitlement } from '@/lib/entitlements';

const { hasIt, entitlements } = await checkEntitlement('watchlists');
console.log('Has watchlists:', hasIt);
console.log('Tier:', entitlements.tier);

// Test withEntitlement
import { withEntitlement } from '@/lib/entitlements';

const result = await withEntitlement(
  'exports',
  async () => 'success',
  { fallback: 'denied' }
);
console.log(result); // 'success' if entitled, 'denied' otherwise
```

### Automated Tests

Tests for these helpers should be added to the test suite. The helpers are pure functions that delegate to `getEntitlements()` and `hasEntitlement()`, so they're easy to test.

---

## 8. Usage Examples Across Codebase

### 8.1 Dashboard Page (Current — Unchanged)

```typescript
// Current pattern is efficient for multiple checks
const entitlements = await getEntitlements();
const hasWatchlists = hasEntitlement(entitlements, 'watchlists');
const hasAlerts = hasEntitlement(entitlements, 'alerts');
const hasApi = hasEntitlement(entitlements, 'api');
```

**Why unchanged:** Dashboard checks 3+ entitlements, so calling `getEntitlements()` once is more efficient.

### 8.2 Watchlist Page (Could Use checkEntitlement)

```typescript
// Current:
const entitlements = await getEntitlements();
const hasWatchlistEntitlement = hasEntitlement(entitlements, 'watchlists');

// Alternative with helper:
const { hasIt: hasWatchlistEntitlement } = await checkEntitlement('watchlists');
```

**Recommendation:** Keep current pattern — it's clear and efficient.

### 8.3 FAOSTAT Ingestion (Current — Unchanged)

```typescript
const entitlements = await getEntitlements();
if (!hasEntitlement(entitlements, 'bulk')) {
  return {
    records_fetched: 0,
    records_inserted: 0,
    records_updated: 0,
    records_skipped: 0,
    errors: ['Bulk data entitlement required...'],
  };
}
```

**Why unchanged:** The function returns a result object with errors, so throwing an exception would break the pattern.

### 8.4 Future Server Actions (Use requireEntitlement)

```typescript
// New pattern for server actions:
export async function createPriceAlert(formData: FormData) {
  'use server';
  
  // Clear, concise entitlement check
  await requireEntitlement('alerts');
  
  // If we get here, user has the entitlement
  const supabase = await createClient();
  const { error } = await supabase.from('price_alerts').insert({...});
  
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/dashboard');
  return { success: true };
}
```

---

## 9. Acceptance Criteria

### ✅ Centralized Helpers Created
- `EntitlementError` class for structured errors
- `requireEntitlement()` for fail-loud enforcement
- `checkEntitlement()` for conditional rendering
- `withEntitlement()` for conditional execution
- `ENTITLEMENT_LABELS` for UI display
- `ENTITLEMENT_MIN_TIER` for upgrade prompts

### ✅ Backward Compatible
- All existing code continues to work
- No breaking changes to existing functions
- New helpers are additive only

### ✅ Well Documented
- JSDoc comments on all new functions
- Usage examples in this document
- Pattern selection guide provided

### ✅ Type Safe
- All functions are fully typed
- `EntitlementKey` type ensures only valid keys
- Return types are explicit

---

## 10. Next Steps

Stage 6 is complete. Proceed to **Stage 7: Testing**.

**Stage 7 Goals:**
- Write comprehensive tests for all entitlements
- Test RLS policies at database level
- Test application checks at code level
- Test API enforcement
- Test edge cases (expired subscriptions, tier changes, etc.)

---

## 11. References

- **Phase 08A Specification:** User-provided entitlement completion spec
- **Migration 0016:** Commercial entitlements (defines entitlement system)
- **`src/lib/entitlements.ts`:** Core entitlement module (188 lines → ~295 lines)
- **Existing patterns:** Dashboard, watchlist, alerts, exports, bulk enforcement

---

**Stage 6 Status:** ✅ COMPLETE  
**Commit:** Pending  
**Ready for Stage 7:** ✅ YES
