# NFC Platform Delivery Tasks

- [ ] Schema and managed database: implement products, licenses, NFC cards, devices, login attempts, reset requests, content, playlists, favorites, recently played, and audit logs with unique access tokens and product/license isolation.
- [ ] Authentication and device security: preserve Manus OAuth for administration; implement license-password activation, secure device credential hashing, HttpOnly session cookies, rate limiting, device mismatch denial, and admin reset flow.
- [ ] Customer content experiences: deliver distinct music and Quran/Azkar libraries with scoped content, favorites, recent playback, playlists, search, and responsive player shell.
- [ ] Admin operations: dashboard metrics, products, content, licenses, NFC cards, users, device reset requests, device revoke/reset, and audit history with role checks.
- [ ] UX and internationalization: responsive editorial audio-console design, Arabic/English toggle, RTL/LTR layout, accessible states, route manifest, and product-specific visual identities.
- [ ] Seed and documentation: idempotent demo seed for the four products, safe demo access credentials, .env.example, local/migration/hosting/security README.
- [ ] Validation and delivery: diagnostics, typecheck, tests, production build, health/routes checks, managed checkpoint/publication, and GitHub canonical transfer to Shahdhenagl/nfc main.
