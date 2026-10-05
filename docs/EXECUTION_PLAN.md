# GELASETECH — Execution Plan

## Architecture

### Client
- Web application
- Android/mobile application
- Responsive design
- Shared product and identity model

### Core services
- Authentication
- Profiles
- AI conversations
- Memory
- Social graph
- Marketplace
- Orders
- Subscriptions
- Wallet/ledger
- Creator payouts
- Notifications
- Moderation
- Analytics
- Administration

### Data
Supabase is the intended hosted data layer.

Important current Supabase rule: new public-schema tables are not automatically exposed through the Data API, so production tables must be deliberately exposed/granted and protected with RLS.

### AI
Houmba H 1 is the AI layer.

The AI should be a product capability, not the entire business:
- assistant
- sales copilot
- creator copilot
- business automation
- recommendation engine
- support agent

### Payments
Payment providers must be connected server-side. Payment status is never trusted from the client.

The ledger is the source of truth for balances. A payment provider webhook creates/updates a ledger entry after signature verification.

## Production sequence

### Stage A — foundation
- production authentication
- remote database
- profiles
- secure sessions
- core API
- observability

### Stage B — first money
- paid subscription
- checkout
- webhook handling
- entitlement checks
- billing portal
- revenue analytics

### Stage C — marketplace
- seller profiles
- offers
- checkout
- orders
- commissions
- refunds/disputes
- payout eligibility

### Stage D — network
- follows
- posts
- comments
- reactions
- messaging
- discovery
- recommendations

### Stage E — business automation
- team workspaces
- AI agents
- lead pipelines
- automations
- API keys
- usage billing

## Definition of done for every money feature

A feature is not production-ready until:
1. Authentication is enforced.
2. Authorization is enforced server-side.
3. RLS is tested.
4. Amounts are stored in integer minor units.
5. Idempotency is implemented.
6. Provider webhooks are verified.
7. Audit events are recorded.
8. Failure and refund paths are tested.
9. No secret key reaches the client.
10. Real test transactions are verified in the provider's test environment before production.

## Deployment

GitHub is the source of truth.

The web/API deployment should be connected to a production host such as Vercel or an equivalent service. The mobile build should consume the same production API.

Gelasehouse remains a repository/asset source that can be combined into the Houmba H product; it is not the product name.

## Growth loop

Every successful transaction should create a reason for:
- buyer to return,
- seller to return,
- seller to invite buyers,
- business to upgrade,
- creator to publish more.

That loop is more valuable than simply adding more screens.
