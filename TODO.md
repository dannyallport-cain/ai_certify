# Stripe lazy initialization fix for /login crash

- [x] Analyze `/login` runtime failure and locate import chain causing module-load crash
- [x] Confirm patch plan with user
- [x] Refactor `lib/payments/stripe.ts` to lazily initialize Stripe client
- [x] Update Stripe function internals to use lazy client accessor
- [x] Run quick verification (typecheck/build or targeted route check)
- [x] Update this TODO with final status
