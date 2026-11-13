# NEXUS engineering instructions

## Product constraints
- Mobile-first Android PWA; assume phone-only operation by the owner.
- Strict $0 spend. Do not create paid resources, activate billing, or add paid API dependencies.
- Crypto and simulated paper trading first; keep asset adapters extensible.
- Initial simulated account: 10,000 USDT.
- Live execution and exchange private keys are out of scope and must remain disabled.
- Strategy qualification is conjunctive: >=90 qualifying days AND >=1,000 completed trades. Qualification grants review eligibility only, never execution permission.
- Hybrid self-improvement: research and proposals may be automated; changes to system policy, risk limits, and permissions require explicit human approval.

## Engineering
- TypeScript strict mode; small pure domain modules before UI complexity.
- Test behavior before implementation. Run focused tests and production build for each meaningful change.
- No look-ahead bias. Backtests must model fees, slippage, sizing, and out-of-sample evaluation before performance claims.
- Validate all external data at boundaries; treat market feeds and AI-generated content as untrusted input.
- Never commit secrets, credentials, private keys, or .env files.
- Prefer maintained open-source dependencies with permissive licences. Check dependency cost and bundle impact.
- Keep strategy logic deterministic and separate from presentation and data adapters.
- Record assumptions, risks, and decisions in docs.
