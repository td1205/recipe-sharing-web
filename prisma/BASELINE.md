# MySQL baseline (Prisma 5.22)

`0_baseline` recreates the current schema from an empty MySQL 8.0.16+ database,
including `sessions`, FK CASCADE/RESTRICT, UNIQUE and `ratings_chk_1` (1–5 stars).
Prisma 5 cannot express CHECK in the datamodel, so that constraint is included
explicitly in the baseline SQL and verified by the real MySQL test.

Index drift was declarative: `comments(recipe_id)`, `recipes(category_id)` and
`steps(recipe_id)` were redundant prefixes of existing composite/UNIQUE indexes.
InnoDB can replace implicit FK indexes when a suitable composite index exists.
`recipes(user_id)` already uses the index name `recipes_ibfk_1`. Schema now
describes these existing indexes; no corrective add/drop/rename migration is needed.

## New disposable database / clean installation

Point `DATABASE_URL` to the explicitly provisioned empty target, then run:

```sh
npx prisma migrate deploy
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

Never run the baseline SQL directly on a populated database. Do not use the old
`init_db.sql` seed/bootstrap as a migration chain.

## Existing populated database — operator procedure, not executed here

1. Back up and verify a restore on an isolated copy; retain the current application version.
2. Compare the copy with `schema.prisma`; separately verify CHECK constraints,
   session table and index definitions (datamodel diff does not verify CHECK).
3. Only after an authorized operator confirms equivalence, record the existing
   baseline with `npx prisma migrate resolve --applied 0_baseline` against that
   chosen database. This writes migration metadata; it does not replay CREATE TABLE.
4. Run `migrate status` and the read-only diff again. For a non-equivalent legacy
   schema, stop and design/test the actual data migration; do not mark it applied.

This task did not resolve/apply any migration on the primary database. A single
baseline was deployed from empty on independent test databases and replayed
without changes. CI repeats deployment, integration and React/Express/MySQL E2E.

## Tests

Both Prisma and session URLs must point to the same disposable test schema for
the constraint/browser harnesses. `RUN_DATABASE_TESTS=yes`,
`TEST_DB_CONFIRMED=yes`, `TEST_DATABASE_URL`, `TEST_SESSION_DATABASE_URL` are
required; hosts must be loopback and names match `recipe_test_*`.
Run `npm run test:database`, build frontend, install Chromium with
`npx playwright install chromium`, then run `RUN_BROWSER_DATABASE_TESTS=yes npm run test:e2e`
(set that environment variable in PowerShell separately on Windows).
Default runs skip database/browser tests before importing clients. No production
credentials, mail, Gemini or Cloudinary services are needed. Browser app/API calls
are real; only external service hosts are denied, with public font/CDN requests allowed.

References: [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining),
[MySQL FK indexes](https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html).
