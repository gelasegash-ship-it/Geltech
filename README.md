# GELASETECH — WealthAI / Houmba H

GELASETECH is the commercial product workspace combining the existing WealthAI foundation with the Houmba H direction. **Houmba H 1 is the AI; Gelasehouse is a repository/asset source, not the product name.**

The goal is a real, production-grade platform with multiple revenue engines rather than a demo.

## Existing foundation

- Mobile app in `artifacts/mobile`
- API server in `artifacts/api-server`
- Shared workspace libraries in `lib`
- RevenueCat subscription infrastructure
- Portfolio, budget, accounts, withdrawals, QR and AI foundations

## Commercial engine

The product is designed around:

1. AI Pro subscriptions
2. Creator monetization
3. Marketplace transaction fees
4. Business AI automation
5. Paid API usage
6. Promoted discovery/advertising after meaningful traffic

The priority is to prove one useful paid workflow first, then compound into a marketplace and social network.

## Planning documents

- [Wealth Engine](docs/WEALTH_ENGINE.md)
- [Execution Plan](docs/EXECUTION_PLAN.md)

## Production principles

- No simulated revenue, users or payments.
- Payment state is verified server-side.
- Financial records use an auditable ledger.
- Secrets never ship to clients.
- Authorization and RLS are mandatory for remote data.
- Every money operation must be idempotent and webhook-verified.
- AI recommendations do not move money without explicit user approval.

## Stack direction

- React Native / Expo for mobile
- TypeScript API
- Supabase for hosted authentication/data when the production project is active
- RevenueCat for mobile subscriptions where appropriate
- Production web/API hosting through a connected deployment platform

## Important

The business model is a path to wealth, not a guarantee of wealth. Success depends on product-market fit, retention, unit economics, distribution and execution with real users.
