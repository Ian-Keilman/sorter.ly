# sorter.ly Architecture

This document explains how sorter.ly works today, which parts are intentional, and which parts should change before the application grows. It is a living document and should be updated whenever a release changes the data model, runtime, storage, import/export behavior, or platform direction.

The current implementation described here is v0.1.1. Items marked **target** are planned architecture, not current behavior.

## Product constraints

sorter.ly is a local-first, private-by-default collection manager. Its architecture should continue to favor:

- a dependable offline experience
- data ownership and straightforward backups
- fast sorting, filtering, and import/export
- simple code that is easy to review
- a minimal utilitarian interface
- no required account, cloud service, or network connection

These are system requirements, not just product copy. A change that weakens them needs a clear reason.

## Current system

sorter.ly is currently a local web application running as one Node.js process:

```text
Browser
  -> Next.js App Router
     -> Server Components for reads
     -> Server Actions for writes
     -> Route Handler for CSV export
        -> Drizzle ORM
           -> better-sqlite3
              -> local SQLite database file
```

There is no remote API, account system, background worker, or cloud database. The browser talks to the locally running Next.js server, and that server is the only process that should access the database while sorter.ly is running.

### Repository map

- `app/` contains routes, Server Components, client components, Server Actions, and the CSV export handler.
- `db/schema.ts` declares the Drizzle schema.
- `db/index.ts` opens SQLite, enables WAL mode and foreign keys, and exports the Drizzle client.
- `drizzle/` contains committed SQL migrations and Drizzle snapshots.
- `data/` is the default location for the untracked local database.
- `scripts/check-db.ts` performs a basic database health check.
- the root Markdown files describe the product, setup, use, releases, scope, and architecture.

### Runtime and storage

`DATABASE_URL` selects the SQLite file. If it is missing at runtime, the application falls back to `./data/sorterly.db`. Relative paths are resolved from the process working directory, so sorter.ly should be started from the repository root until path handling is made independent of the current directory.

SQLite runs with:

- `journal_mode = WAL` for reliable local reads and writes
- `foreign_keys = ON` so declared cascading relationships are enforced

The application does not currently run migrations automatically. Migration files are generated during development, committed, reviewed, and applied to an installed database with `drizzle-kit migrate`.

## Data model

The schema uses a typed entity-attribute-value design. This is a reasonable fit for customizable collections because users can define fields without creating a new SQL table for every collection.

### Tables

`collections`

- stores a collection's name, slug, optional description, and timestamps
- requires a globally unique slug

`fields`

- belongs to one collection
- stores a display name, stable key, field type, required flag, and display position
- currently supports `text`, `number`, `date`, and `boolean`
- requires field keys to be unique inside a collection

`records`

- belongs to one collection
- acts as the identity and timestamp container for one entry

`record_values`

- joins one record to one field
- has separate nullable storage columns for text, number, date, and boolean values
- permits at most one value row for a record/field pair
- has field-and-value indexes intended to support filtering and sorting

### Strengths

- Custom fields do not require per-collection SQL migrations.
- Values retain useful SQLite types instead of storing everything as text.
- Deleting a collection, field, or record cascades to dependent rows.
- Stable field keys support CSV mapping and a future interchange format.

### Costs

- Fetching a complete record requires joining or assembling multiple rows.
- Cross-table rules are more important and more complicated than in a fixed table.
- Adding a field type should distinguish its user-facing behavior from its storage type. A rating can use numeric storage; it should not require another value column just because its editor is different.
- Large collection sorting and filtering must eventually run in SQL rather than loading every value into JavaScript.

## Required data invariants

The following rules define valid sorter.ly data. v0.1.2 should enforce them in shared application code and, where practical, in SQLite.

| Invariant | v0.1.1 status | Target |
| --- | --- | --- |
| A record and field in a value row belong to the same collection | Not enforced by SQLite | Enforce with a schema constraint or guarded write path, plus tests |
| One value exists at most once for a record/field pair | Enforced by a unique index | Keep |
| A value row uses exactly one typed value column | Not enforced by SQLite | Add a `CHECK` constraint |
| The populated value column agrees with the field's storage type | Enforced only by current write code | Central validation plus database protection where maintainable |
| Required fields contain a valid value | Only suggested by HTML form attributes | Enforce on every server-side write and import |
| A compound write either completes fully or changes nothing | CSV import only | Use transactions for record writes and field deletion/reordering |
| A mutation is scoped to its collection | Inconsistent | Include collection ownership in every lookup and mutation |
| `updated_at` changes after an effective edit | Partially enforced | Enforce consistently |

Two invalid states were reproduced during the v0.1.2 audit without triggering a foreign-key error: a value could connect a record from one collection to a field from another, and one value row could populate both text and number columns. These are latent integrity risks even though the current UI does not intentionally create them.

## Current request flows

### Reads

Server Components query Drizzle directly. The collection page currently loads all fields, records, and values for a collection, assembles records in memory, then filters and sorts in JavaScript.

This is acceptable for small early collections. It is not the final design for a product whose priority is fast sorting and filtering. The target is a query layer that performs filtering, sorting, and pagination in SQLite while keeping the route components focused on presentation.

Synchronous SQLite queries can also execute during Next.js prerendering. Database-backed reads must explicitly wait for a request so a production build does not capture a build-time database snapshot.

### Writes

Server Actions currently parse `FormData`, validate some inputs, query SQLite, perform writes, revalidate routes, and redirect. This keeps the early application small, but it duplicates value parsing between create, edit, and CSV import and mixes transport, rules, and persistence.

The most important current write risk is record editing: existing values are deleted before replacement values are inserted, without a transaction. An insertion error can therefore leave a record empty or partially updated.

### CSV import

Import parsing and inserts are handled in one Server Action. v0.1.1 correctly made the database changes atomic and makes duplicate or blank headers unique. Remaining work includes:

- a file-size and row-count limit
- a preview before mutation
- row and cell validation results
- one shared value parser for manual entry and import
- an explicit duplicate policy

### CSV export

Export is implemented as a route handler that streams a generated CSV response. It escapes CSV quoting correctly. Before spreadsheets are treated as a trusted interchange path, exported text beginning with spreadsheet formula characters should be handled with an explicit policy and documented trade-off.

CSV remains a lossy interchange format because it does not fully describe field types, defaults, configuration, images, or future collection metadata.

## Target application boundary

The target is a small separation, not a large framework inside the framework:

```text
Presentation and transport
  app routes, components, Server Actions, route handlers
                  |
                  v
Platform-neutral core
  field definitions, value parsing, validation, duplicate rules
                  |
                  v
SQLite adapter
  queries, transactions, Drizzle schema, migrations
```

### Presentation and transport

The `app/` layer should own HTTP and Next.js concepts: `FormData`, route parameters, redirects, revalidation, responses, and rendered UI. It should not define the only copy of a data rule.

### Platform-neutral core

**Target:** plain TypeScript modules should define field kinds, storage types, normalized values, validation errors, default behavior, and duplicate comparison. These modules must not import Next.js, Drizzle, `better-sqlite3`, browser APIs, or Node-only filesystem APIs.

This boundary gives manual forms, CSV import, tests, and a future native adapter the same behavior without adding a generic enterprise service layer.

### SQLite adapter

**Target:** database modules should own queries and transaction boundaries. Compound operations should be exposed at the level of a user action, such as "replace record values," rather than as a series of unrelated inserts and deletes in a route action.

Direct Drizzle access can remain appropriate inside this adapter. A repository interface should be introduced only when a real second adapter or a test seam needs it.

## Field type design

Future field work should separate three concepts:

- **kind:** what the user sees and edits, such as number or rating
- **storage type:** how the value is represented, such as a SQLite number
- **configuration:** options such as rating maximum, decimal precision, default value, or image restrictions

A rating should be a number-backed field kind with validated configuration. Default values belong to field configuration and must be applied consistently by manual creation and import. Field configuration should be versioned and validated rather than treated as arbitrary JSON throughout the application.

Images should not be stored as absolute filesystem paths or embedded into `record_values`. A future asset table should use stable IDs, relative managed paths, media metadata, and reference counting or guarded deletion. The actual files should live in an application-managed data directory and be included in backups and sorter.ly exports.

## Privacy and security boundary

Private by default currently means:

- data is stored in a local SQLite file
- the repository ignores the database and environment files
- no account or network service is required

The current `next dev` and `next start` defaults listen on all network interfaces. Because sorter.ly has no authentication, v0.1.2 should bind ordinary scripts to `127.0.0.1`. LAN access, if ever offered, should be a separate explicit command with a visible warning.

This application should also add sensible import limits and avoid logging record contents. Any future web account mode needs authentication, authorization, CSRF-aware mutation design, encrypted transport, and a separate threat model; it must not silently change the safety assumptions of local mode.

## Performance direction

The early in-memory record assembly should be replaced incrementally, after correctness is protected:

1. Define a query input for filter, sort, direction, page size, and cursor or offset.
2. Move sorting and filtering to SQLite for supported field storage types.
3. Fetch only values required for the visible page.
4. Add pagination before virtualization; virtualization alone does not reduce database work.
5. Add representative performance tests with thousands of records and several fields.

The existing indexes are useful starting points. Index changes should be driven by real query plans and benchmarks rather than speculative additions.

## Migrations and compatibility

The migration policy is:

- `db/schema.ts` and committed files in `drizzle/` move together.
- Developers run `drizzle-kit generate` after an intentional schema change and review the generated SQL.
- Installers and users run `drizzle-kit migrate`; they should not generate new migrations.
- Every migration is tested against both a new empty database and a copy shaped like the previous release.
- Back up the database before a migration that rebuilds tables or transforms values.
- Released migrations are append-only. Never edit a migration already included in a preserved release.

A sorter.ly interchange format should be versioned independently from the database schema. It should eventually contain collection metadata, ordered field definitions and configuration, records, values, and managed assets. Import must reject unsupported future major versions cleanly.

## macOS and iOS direction

The current Next.js application depends on Server Components, Server Actions, a Node.js process, and native `better-sqlite3`. It cannot be turned into a static Tauri application by changing a build flag.

Tauri 2 is still a reasonable candidate because its SQL plugin supports SQLite on desktop and mobile platforms. The safe sequence is:

1. Stabilize and test the platform-neutral core.
2. Put current SQLite writes behind deliberate adapter functions.
3. Define the application data directory, backup format, and asset rules.
4. Prototype one small macOS build with a native SQLite adapter.
5. Validate iOS storage, file import/export, signing, sandboxing, and App Store constraints.
6. Decide how much React presentation code can be shared without forcing the native app to imitate Next.js server behavior.

Device compatibility and cloud synchronization remain separate. A native sorter.ly app should work fully offline before sync is considered.

## Testing strategy

v0.1.2 should establish a small, high-value test base:

- unit tests for value parsing, required values, defaults, duplicate comparison, and CSV parsing
- integration tests using a temporary SQLite database for constraints, cascades, transactions, and migrations
- action or end-to-end smoke tests for create, edit, delete, import, and export
- a database health command that checks integrity, foreign keys, and the applied migration state

The repository already includes `tsx`, and Node's built-in test runner is sufficient for the first unit and integration tests. A new test dependency is not necessary yet.

## Architecture decisions

Accepted:

- Keep SQLite and Drizzle for the local application.
- Keep the typed value model; harden its invariants instead of replacing it wholesale.
- Keep Next.js for the v0.1.x local web application.
- Treat offline native support separately from accounts and sync.
- Prefer small domain modules and explicit transactions over a broad abstraction layer.

Proposed for v0.1.2:

- Bind local commands to loopback by default.
- Centralize record value normalization and validation.
- Make all compound mutations transactional and collection-scoped.
- Add database constraints for typed values and cross-collection ownership.
- Mark synchronous database reads as request-time work.
- Add migration and data-integrity tests before new field kinds.

Open decisions:

- Which fields define a duplicate: all populated fields, selected identity fields, or a collection-level rule?
- Should blank optional booleans be distinct from `false`?
- What should the sorter.ly interchange extension and archive layout be?
- Is Tauri 2 the final native shell after the macOS proof of concept?
- Which image formats, limits, thumbnails, and deletion rules belong in the first asset release?

## Reference constraints

- Next.js documents that synchronous `better-sqlite3` reads can happen during prerendering and recommends `connection()` before request-time queries: https://nextjs.org/docs/app/api-reference/functions/connection
- Next.js development and production servers support an explicit hostname; ordinary sorter.ly scripts should use loopback: https://nextjs.org/docs/app/api-reference/cli/next
- Drizzle distinguishes generating committed migration files from applying them: https://orm.drizzle.team/docs/drizzle-kit-generate and https://orm.drizzle.team/docs/drizzle-kit-migrate
- Tauri's Next.js guide requires static export and does not support server-based Next.js features: https://v2.tauri.app/start/frontend/nextjs/
- Tauri's SQL plugin currently lists SQLite support for Windows, Linux, macOS, Android, and iOS: https://v2.tauri.app/plugin/sql/
