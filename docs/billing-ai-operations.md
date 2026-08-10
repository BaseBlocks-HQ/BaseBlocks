# Billing and hosted AI operations

BaseBlocks application code consumes `billing:getWorkspaceEntitlements`; it
does not inspect Polar state. Checkout, portal, cancellation, and seat updates
use the provider-neutral actions in `billing.ts`. The Polar webhook endpoint is
`/billing/webhooks/polar` on the Convex site URL.

Hosted AI is credit-funded rather than plan-gated. Free workspaces can buy and
spend prepaid AI credit packs. Plus workspaces additionally receive recurring
included credits for their subscription period and can buy the same prepaid
packs. Recurring credits are spent first and replaced at the next billing
period; prepaid credits remain until spent.

## Sandbox configuration

1. Set `BASEBLOCKS_BILLING_ENVIRONMENT=sandbox`, `POLAR_ENVIRONMENT=sandbox`,
   the sandbox access token, and the sandbox webhook secret in the Convex dev
   deployment. Tokens are environment-specific.
2. Set `BASEBLOCKS_APP_ORIGIN` to the exact HTTPS application origin used for
   checkout redirects. Production API access remains disabled unless
   `POLAR_ALLOW_PRODUCTION=true` is explicitly set.
3. Configure catalog rows through the internal
   `billingModel:configureCatalogItem` mutation. Monthly and annual Plus plans
   are distinct SKUs/products. AI packs grant integer micro-USD credit units.
4. Configure the model rate card through `aiCredits:configureRateCard`. Every
   limit and `maxChargeUnits` is an admission boundary; changing pricing or
   model routing requires a new policy version.
5. Set `BASEBLOCKS_AI_FUNDING_MODE=hosted-funded` and `EDITOR_AI_MODEL` in the
   web runtime. Configure either Vercel OIDC or `AI_GATEWAY_API_KEY`. When both
   exist, the Gateway SDK uses the API key.
6. Set the same random 32+ character `AI_RECONCILIATION_SECRET` in the web and
   Convex runtimes. Protect `/api/internal/ai/reconcile` with Vercel's
   `CRON_SECRET`; `apps/web/vercel.json` schedules it every five minutes.

One customer credit unit equals USD 0.000001 of displayed AI balance. A paid
top-up grants exactly the authoritative paid amount in customer credit units.
Gateway provider cost is rounded upward once and converted to a retail charge
with a 25% markup over provider cost (20% gross margin). Authorization,
reservations, ledger deltas, and settlement values are stored as Convex
`int64` values.

## Verified development configuration

On 2026-08-09, the integrated code was deployed to the Convex Development
deployment `dutiful-aardvark-750`. Vercel Development and Preview route the
editor through `openai/gpt-5.4-mini`; Vercel Development has
`BASEBLOCKS_BILLING_ENVIRONMENT=sandbox`, and Vercel deployments use OIDC rather
than a static Gateway key. The current Gateway catalog reports 0.75 micro-USD
per input token and 4.5 micro-USD per output token for that model. The
Development rate card is policy `gateway-2026-08-11-v3`: 750,000 credit units
per million input tokens, 4,500,000 per million output tokens, a 25% safety
buffer, 256,000 maximum cumulative input tokens, 32,000 maximum output tokens,
and a 420,000-unit ($0.42) maximum charge per run. The larger cumulative input
budget supports multi-step workspace edits while every run remains bounded by
the matching worst-case credit reservation.

Polar Sandbox is configured for the Baseblocks organization only. The
non-secret organization ID is `0da2808f-84f6-4ab9-aac1-c6d4bdbe5d85`. The
Sandbox dashboard showed `Overview | Baseblocks | Polar` and the banner
“Changes you make here don't affect your live account · Payments are not
processed.” A Sandbox Organization Access Token and webhook signing secret
were set only in Convex Development; neither value belongs in this repository,
logs, or client runtime.

The configured Sandbox catalog is:

- `plus_monthly`: product `122e61ae-c132-4e5b-acc7-3997549351c5`, price
  `c29bba43-cc0c-4273-a6f4-653ef7a4d508`, seat-based USD $8/member/month,
  included `500000` credit units.
- `plus_annual`: product `eed7da35-ff9a-4d81-b8fd-53cb5243a25c`, price
  `fbcf02ae-f7a9-4c06-8fc4-4ef1ae22a2e7`, seat-based USD $80/member/year,
  included `6000000` credit units.
- `ai_credit_top_up`: product `48fdf2e1-9135-4197-b0a5-7b9ba4659a82`, custom
  price `9868df2b-9e74-466f-ac84-9bbcb69b9e96`, one-time USD with a $5 Polar
  minimum and a $10 preset. BaseBlocks offers $5, $10, and $20 shortcuts plus
  Polar's editable custom amount. There is no BaseBlocks maximum.

The former fixed $5 and $25 products are archived in Polar Sandbox and their
Convex catalog rows are inactive.

All three active catalog rows are mapped in Convex Development. Included credit
units are workspace-level lots, never
multiplied by seat count. On a paid `subscription_update`, the unused available
portion of prior recurring included lots is atomically replaced by the new
plan's lot. Reserved units remain with their existing reservation until settle
or release; purchased prepaid lots are never replaced. Replayed webhook events
find no available prior recurring units and do not create another adjustment.
The provider-cost assumptions are 0.75 micro-USD/input token and 4.5
micro-USD/output token, rounded up at the adapter seam before the retail markup.

The Sandbox webhook endpoint is enabled as `BaseBlocks Convex Development`,
ID `d27679ca-b03f-4e71-a0f2-9edbb9b5bb7e`, URL
`https://dutiful-aardvark-750.convex.site/billing/webhooks/polar`, raw format.
It subscribes to checkout, order, and subscription lifecycle events. Real
Sandbox test-card events reached Convex Development and were processed.

Sandbox verification completed checkout, portal, seat, plan-change,
cancellation, webhook, and credit-pack flows. A $16 monthly checkout at two
seats became an active two-seat subscription; the portal owner session listed
two seats, two synthetic members were claimed, a third assignment returned
`SeatNotAvailable`, and revocation returned capacity. Month→year→month and
cancel-at-period-end→uncancel both succeeded. The former fixed-pack flow was
also verified before being replaced by customer-selected top-ups. Convex
Development recorded signed negative proration orders as paid signed amounts
without granting credits.

## Production configuration

On 2026-08-11, production deployment `quiet-alligator-768` was backed up,
deployed, and configured for Polar Production and hosted Vercel AI Gateway
funding. The verified backup, including file storage, is
`quiet-alligator-768-pre-billing-ai-20260811.zip` in the private Codex backup
directory. The deployment dry run reported no deleted indexes before the new
billing, credit, guest-access, storage-telemetry, and workspace indexes were
applied.

The live Polar catalog is:

- `plus_monthly`: product `70448a26-eabc-4753-8084-7ac398bb416f`, price
  `f32858d8-d95c-4c89-ae3e-94dedc43aba1`, seat-based USD $8/member/month,
  included `500000` credit units.
- `plus_annual`: product `41b428b2-adfa-4b53-80cd-de5eb0ac5d51`, price
  `0c4a64a3-98a5-4224-9fa3-6b3d3d6b0e8c`, seat-based USD $80/member/year,
  included `6000000` credit units.
- `ai_credit_top_up`: product `3794706c-ebf5-4324-ab25-26a975eff506`, custom
  price `6f2658e9-e6cd-4243-81f7-412358e0bdae`, one-time USD with Polar's $5
  minimum, $10 preset, and no maximum.

The production webhook is enabled as `BaseBlocks Convex Production`, ID
`b1f36de4-f1f4-4921-b34f-2d9d28b42efd`, at
`https://quiet-alligator-768.convex.site/billing/webhooks/polar`. It uses raw
payloads and subscribes to all checkout, order, and subscription lifecycle
events. Production uses rate-card policy `gateway-2026-08-11-v3`, matching the
verified Development limits and prices above. Access tokens, webhook signing
secrets, reconciliation secrets, and cron secrets remain only in their
provider environment stores.

The team customer portal requires the member identity. The adapter now sends
`external_member_id` equal to the workspace external customer ID, matching
Polar's purchaser/owner member mapping observed in Sandbox. Keep this mapping
covered by the Polar contract test.

The installed official Polar CLI is v1.3.9. `polar login --help` exposes only
global output/completion/help/version/wizard options; it has no `--sandbox`,
environment, server, or base-URL selector. The current Polar CLI/API docs use
`polar login` for the account flow, while Sandbox API access requires a
separate Sandbox Organization Access Token and the
`https://sandbox-api.polar.sh/v1` base URL. The CLI was not used for
mutations; the authenticated Sandbox dashboard/API was used instead. Never
run the unscoped CLI login against a production account for this workflow.

Known Sandbox limitations observed during verification:

- Direct Polar checkout creation requires a DNS-valid customer email when one
  is supplied; the adapter should pass the authenticated user's real verified
  email, never a test or app-domain placeholder.
- A local origin such as `http://localhost:3001` (the app default; the
  Development billing configuration used `http://localhost:3011`) fails the
  adapter's HTTPS redirect guard. The direct Sandbox checkout used the HTTPS
  `baseblocks.dev` return URLs. A hosted app deployment is required for a
  full app-level checkout redirect test.
- Vercel Cron invokes only Production deployments, not Preview deployments.
  A successful AI result is delivered while its maximum-cost reservation
  remains held if Gateway accounting has not propagated yet. The request then
  schedules bounded post-response reconciliation retries so Preview settles
  without a cron. The protected five-minute cron remains the durable Production
  recovery path. Exact settlement releases every unused reserved unit.

## Owner self-test

The local app is suitable for account creation, onboarding, and the fail-closed
no-credit/paywall check. Full checkout return, hosted AI Gateway generation,
and browser portal tests use the HTTPS owner Preview; the billing adapter
intentionally rejects local HTTP checkout redirects.

1. Start local Development with the Convex Development deployment and create a
   brand-new account using a unique real email. Complete onboarding, choose the
   intended personal/work intent, and verify the workspace appears in the
   dashboard.
2. Open the AI/editor entry before purchasing credits. Confirm the request is
   denied with the no-credit/paywall state and no Gateway generation is made.
3. Use the HTTPS owner Preview for no-charge tests against Convex Development
   and Polar Sandbox. Use `https://baseblocks.dev` only for deliberate live
   purchases; production provider access and hosted Gateway funding are
   enabled.
4. Start a Plus Monthly checkout for one member. In Polar Sandbox use Visa
   test card `4242 4242 4242 4242`, any future expiry, any three-digit CVC,
   and a valid test billing address. Sandbox payments are not processed.
   Verify the return URL, one entitled seat, one workspace-level included lot,
   and a successful small AI request through the Gateway.
5. Open the customer portal, verify the subscription and seat capacity, assign
   one additional synthetic member if the checkout has capacity, confirm a
   third assignment is rejected when capacity is full, then revoke the test
   member and confirm capacity returns. Verify plan change
   monthly→annual→monthly leaves only the current unused included lot while
   preserving any purchased prepaid pack.
6. Record the checkout, subscription, order, webhook, and Convex ledger IDs in
   the private test log, then cancel/delete only Sandbox/Development test data
   according to the provider's supported lifecycle operations.

## Reconciliation and retention

- Webhook deliveries are signature-verified over raw bytes, deduplicated by
  `webhook-id`, stored for audit, and processed asynchronously. Failed inbox
  rows remain retryable.
- A generation ID without authoritative cost leaves its reservation in
  `reconcilePending`; the completed answer or validated edit may still be
  delivered because the maximum permitted charge is already fully reserved.
  Funds are not released on an ambiguous network failure.
  Use `aiCredits:listReconciliationCandidates` and
  `aiCredits:reconcileReservation` only with Gateway generation evidence or
  proof that no generation reached the provider.
- Run `storageTelemetry:reconcileWorkspace` periodically and after introducing
  telemetry to an existing workspace. Storage is telemetry only and never an
  upload quota.
- Before Workspace deletes an organization, call/import the provider-neutral
  guard in `model/billingRetention.ts`. Active subscriptions and unsettled AI
  reservations block deletion. Financial ledger, order, subscription, webhook,
  generation, and storage event rows are intentionally retained for audit;
  only derived entitlement and storage projections are removed.

Do not run a production migration from a development checkout. Generate and
review Convex schema changes against a configured dev deployment first.
