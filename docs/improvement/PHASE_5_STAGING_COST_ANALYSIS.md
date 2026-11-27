# Phase 5 — Staging & Cost Analysis

**Status:** analysis complete · **No plan change was made, no project created or repurposed**
**Pricing verified:** 2026-11-26 against `https://supabase.com/pricing` (fetched during this phase)

---

## 1. Verified current pricing

Read directly from the vendor pricing page on the date above. Figures below are the ones the page
states; anything derived is marked as derived.

| Plan | Published price | Published inclusions that matter here |
|---|---|---|
| Free | **$0** | 2 active projects · 500 MB database · shared CPU / 500 MB RAM · 5 GB egress · 1 GB storage · **projects paused after 1 week of inactivity** · no backups listed |
| Pro | **from $25/mo** | first project included · additional projects **from $10/mo** · **$10/mo compute credit (covers one Micro)** · 8 GB disk · daily backups **7-day** retention · 7-day log retention · email support |
| Team | **from $599/mo** | everything in Pro + SSO, SOC2/ISO, 14-day backups, 28-day logs, SLAs |
| Enterprise | custom | — |

Compute add-ons (per project, monthly): Micro **$10** (1 GB RAM, shared) · Small **$15** (2 GB) ·
Medium **$60** (4 GB) · Large **$110** (8 GB, dedicated 2 vCPU) · XL **$210** and up.

**Annual billing:** the pricing page as verified does not publish an annual rate. Any annual figure
would be a derivation, not a quote, so none is presented as verified here. If annual pricing exists
it must be confirmed in the dashboard at purchase time.

### 1a. This supersedes the Phase 2 figures

Phase 2 §10 quoted "Pro from $25/mo", "Pro + Small compute **$40/mo**" and a
"≈ $35/month" staging option. Re-reading the pricing page on 2026-11-26 shows why those
differ: the page now states that paid plans include **$10/mo in compute credits** and that
**additional projects start at $10/mo**. A second project therefore costs $10 (project) plus its
compute, less a credit that is already consumed by the first project. The $35 figure omitted the
additional-project fee; the $40 figure omitted the credit. The figure to plan against is **$45/mo**.

## 2. What the current project is, and what it is not

| Fact | Value | Source |
|---|---|---|
| Plan in use | Free | Phase 2 audit; unchanged since |
| Free-plan project limit | 2 active | pricing page |
| `create_project` on this plan | returns **`400`** | measured in Phase 2 — do not retry without a decision |
| Databases available for testing | local migration-chain replica only | this phase |
| Production data at risk in this analysis | none — nothing was executed | — |

The free plan's inactivity pause is the decisive constraint: a staging project that is paused after
a week of idleness is not a verification environment. A release window scheduled a month out would
find the "staging" database asleep, and waking it is an interactive dashboard action.

## 3. Options costed

Monthly, at the compute size that matches this workload (Micro is sufficient: the replica is
hundreds of megabytes at most):

| Option | Composition | Monthly | Closes H-1…H-10? |
|---|---|---|---|
| **A. Pro, staging as a second project** | $25 plan + $10 second project + ($10 + $10 compute − $10 credit) | **$45** | **Yes** — real PostgREST, real JWT issuance, disposable data |
| B. Pro, staging in a separate organisation | $25 (one project, Micro covered by the credit) | **$25** | Yes, but two subscriptions to administer and no shared billing view |
| C. Pro + Small compute for staging | $25 + $10 + ($10 + $15 − $10) | **$50** | Yes; Small is unnecessary at current data volume |
| D. Second Free project | $0 | **$0** | **No** — paused after 1 week idle, no backups, and creation currently fails with `400` |
| E. Local simulation only (Layer B shim) | engineering time | $0 | **No** — cannot prove PostgREST behaviour (see `PHASE_5_HOSTED_TEST_STRATEGY.md` §2) |

All of these are *monthly*. A one-week verification window still bills a full month; the minimum
spend to close the gap is **$45 for Option A**.

For reference, the annual equivalent of Option A is 12 × $45 = **$540** — a derivation from
monthly pricing, not a published annual rate.

## 4. What the money buys, and what it does not

**Buys:** a hosted database where the production defect can actually be reproduced — `42P01` from
the resolver through `POST /rest/v1/rpc/user_entitlements`, `PGRST202` on the old argument name,
anonymous report reads through PostgREST, RLS denials as HTTP 403, and a real service-key path.
That is H-1…H-10, i.e. the entire remaining gap.

**Does not buy:** a production rehearsal. Staging has no production data, no production traffic
shape, no CDN in front of it, and its migration history must be built by replaying the chain —
which is the point of the preflight queries in the release runbook.

**Does not buy:** independence from the decision. Pro on the existing organisation puts staging in
the same organisation as production. That is acceptable for a short verification window and is not
acceptable as a permanent arrangement for a system holding counterparty data — a separate
organisation (Option B) is the cleaner long-term shape.

## 5. Backup and recovery requirements

| Requirement | Free | Pro | Comment |
|---|---|---|---|
| Platform daily backups | not listed | 7-day retention | Free has no platform-level restore path |
| Restore before a migration window | manual `pg_dump` | daily + manual | Manual dump is required on either plan: the rollback in `0059`/`0057` depends on capturing **policy definitions and ACLs**, which a row-level restore does not preserve |
| Log retention for incident review | not listed | 7 days | `[entitlements]` failure logs need to outlive the window |
| Point-in-time recovery | not listed on the pricing page | not listed on the pricing page | Treat as unverified; do not plan around it |

Minimum release requirement, independent of plan: a schema+ACL dump taken immediately before the
apply, stored outside the database, plus the captured `pg_policies` and `relacl` output for the
four entitlement tables and `orders` (the exact commands are in `PHASE_5_RELEASE_RUNBOOK.md` §3).

## 6. Recommendation

1. **Buy Option A for one month, at the moment a verification window is scheduled** — not now.
   Buying it now starts a clock that the free-plan pause and staff availability will waste.
2. **Do not create, upgrade or repurpose anything until that decision is taken.** This analysis
   deliberately stops short of provisioning, per the standing restriction.
3. **If the window is deferred**, build the Layer B shim and run the API-side checks; that is
   useful work that does not consume the budget, but it must not be reported as hosted acceptance.
4. **Re-verify the price on the day of purchase.** Every figure in §1 is a snapshot of one page on
   one date; vendor pricing changes without notice and this document will not.

## 7. Evidence

```
Fetched: https://supabase.com/pricing        2026-11-26
Stated:  Free $0 · Pro from $25/mo · Team from $599/mo
         Pro: first project included, additional from $10/mo, $10/mo compute credits
         Compute: Micro $10 · Small $15 · Medium $60 · Large $110 · XL $210
         Free: 2 active projects, paused after 1 week of inactivity, 500 MB database
         Pro: daily backups 7-day retention, 7-day log retention
```

No annual figure appears on that page; none is asserted here.
