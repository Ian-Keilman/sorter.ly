# How sorter.ly is put together

This is the architecture document for sorter.ly, current as of v0.1.3.

The short version: sorter.ly is a local Next.js app talking to one SQLite file. There are no microservices, no cloud account hiding behind a curtain, and no reason to make this look like software used to coordinate an international airport.

The longer version is below, because "it uses a database" stops being a useful explanation pretty quickly.

## The rules that actually matter

sorter.ly should stay:

- local-first
- private by default
- fully useful without an internet connection
- fast to sort, filter, import, and export
- simple enough that one person can still understand it
- minimal and utilitarian, but not in a "please give me an internship" way

These are architecture rules, not just README decorations. If a clever technical idea makes one of them worse, the idea probably is not that clever.

## Current setup

```text
Browser
  -> Next.js pages and components
     -> Server Actions for changes
     -> Route Handler for CSV export
        -> shared field configuration and record rules
           -> Drizzle ORM
              -> better-sqlite3
                 -> one local SQLite file
```

The app runs as one local Node.js process. The browser talks to it on `127.0.0.1`, and that process reads and writes the database.

There is no remote API, account system, background worker, or cloud database right now. This is intentional. sorter.ly is a collection manager, not a distributed-systems group project.

## Where things live

- `app/` contains pages, components, Server Actions, and the CSV export route.
- `core/` contains plain TypeScript field configuration, parsing, and record rules that do not depend on Next.js, Drizzle, Node.js, or the browser.
- `db/` contains the Drizzle schema, SQLite connection, and database-specific value mapping.
- `drizzle/` contains the migration history. Once a migration ships, it is history and does not get quietly rewritten later.
- `tests/` contains unit and SQLite integration tests.
- `data/` is the default home of the actual local database. The database is ignored by Git, which is good unless somebody wants their candy rankings in a public commit.

## Runtime and storage

`DATABASE_URL` selects the SQLite file. If it is missing, sorter.ly uses `./data/sorterly.db`.

Relative database paths currently depend on starting sorter.ly from the repository root. That is fine for the current installation method, but a packaged desktop app will eventually need an operating-system-specific application data directory.

SQLite starts with:

- write-ahead logging (`WAL`)
- foreign-key enforcement

Normal `dev` and `start` commands bind to `127.0.0.1`. sorter.ly has no login screen, so casually serving somebody's private collection to the rest of the local network would be a strange interpretation of "private by default."

## The database model

The database uses four main tables.

### `collections`

One row per collection. It stores the name, slug, optional description, and timestamps.

### `fields`

One row per custom field. A field belongs to a collection and has a name, stable key, type, versioned configuration, required flag, and position.

The current field types are:

- text
- number
- date
- boolean
- rating

`type` means the field kind the user interacts with. It does not automatically mean a new storage column. A rating is a rating kind backed by the existing numeric storage type.

`configuration` is JSON stored as ordinary SQLite text. Its current version is `1`. It can contain a canonical string default and, for ratings, a maximum and step. SQLite checks the JSON shape, version, and rating settings; `core/field-config.ts` performs the stricter application validation. Keeping the configuration versioned gives a future native client something explicit to understand instead of asking it to interpret vibes.

### `records`

One row per entry in a collection. The row mainly supplies identity, collection ownership, and timestamps.

### `record_values`

This is the slightly unusual table that makes custom fields possible. Each row connects one record to one field and stores the value in one of four typed columns:

- `text_value`
- `number_value`
- `date_value`
- `boolean_value`

Four nullable columns may look mildly cursed at first glance, but it gives SQLite real numeric and boolean values instead of shoving everything into text. Exactly one of those columns must contain a value. Ratings use `number_value`; nicer controls are not a new primitive data type.

The table also stores `collection_id`. That looks redundant, and technically it is, but it lets SQLite prove that the record and field belong to the same collection. A little duplication is better than a value escaping into somebody else's collection and pretending nothing happened.

## Database rules

The database now protects these rules:

- fields and records belong to real collections
- a record value's record and field belong to the same collection
- one record/field pair has at most one value row
- exactly one typed value column is populated
- boolean values are `0`, `1`, or empty
- field types are one of the five supported kinds
- field configuration is valid version-1 JSON with the correct rating shape
- required flags are valid booleans
- deleting a collection, field, or record removes its dependent data

The application protects the rules too. Database constraints are the final seatbelt, not the steering wheel.

## Reading data

Pages currently query Drizzle directly. The collection page loads a collection's fields, records, and values, builds the table in memory, then sorts and filters in JavaScript.

That is understandable and perfectly adequate for small collections. It is not the final answer for the "fast sorting and filtering" part of sorter.ly.

All synchronous database reads now wait for an actual request. This prevents a production build from accidentally turning the home page into a photograph of whatever happened to be in SQLite during `npm run build`.

The later large-collection patch should move filtering, sorting, and pagination into a small database query layer. Next.js also recommends a dedicated data access layer for centralizing server-only reads. sorter.ly does not need an enterprise repository ceremony, but pages should eventually ask a focused query function for exactly the rows they need. That work should be driven by real query plans and benchmarks rather than adding seventeen indexes because they looked lonely.

Field configuration is parsed once per collection request before rating cells are formatted. CSV import also prepares field definitions once before walking up to 10,000 rows. Re-validating the same JSON half a million times would be technically correct and spiritually wasteful.

## Changing data

Server Actions still deal with Next.js things such as `FormData`, redirects, and page revalidation.

The actual record value rules live in `core/record-values.ts`. Manual record forms and CSV import both use the same code for:

- trimming text
- parsing finite numbers
- checking ISO dates
- parsing booleans
- validating rating ranges and precision
- applying defaults when the caller asks for them
- enforcing required fields

`core/field-config.ts` owns the five field kinds, the kind-to-storage mapping, configuration parsing, rating settings, and deterministic serialization. Defaults are stored as canonical strings, then sent through the same typed normalization as ordinary input. That keeps JSON portable and prevents a second, slightly different definition of what a valid number or date means.

Defaults apply when creating a record and when a nonblank CSV row has a blank or missing cell. Editing an existing record does not apply defaults to empty values, and changing a default does not backfill old records. A checkbox submits an explicit `true` or `false`, so a default of `true` can still be deliberately unchecked.

Rating settings can be edited, but a new maximum or step is validated against every existing value before the change is saved. The settings do not get to declare stored data illegal and then leave the room.

Database-specific row construction lives in `db/record-values.ts`.

Compound changes use transactions. Creating a record writes the record and values together. Editing a record replaces its values and updates its timestamp together. Deleting and resequencing fields also happens together. If one part fails, SQLite rolls back the whole operation instead of leaving half a record on the floor.

Deletes and updates include the collection ID in their conditions. Hidden form fields are useful inputs, not proof of ownership.

## CSV

CSV is supported because Excel and Sheets exist and pretending otherwise would not help anybody.

Import currently:

- accepts files up to 5 MB and 10,000 data rows
- handles quoted commas, escaped quotes, BOMs, CRLF, and blank rows
- keeps duplicate headers by giving them numbered names
- reuses matching fields and creates text fields for new headers
- validates typed and required fields before writing anything
- applies configured defaults to blank cells
- validates rating range and precision using the same rules as manual entry
- imports everything in one transaction
- changes nothing if any row is invalid

Export quotes ordinary CSV values correctly and includes a UTF-8 BOM for spreadsheet compatibility. Ratings export as raw numbers rather than strings such as `8.7 / 10`, which keeps CSV round trips honest.

CSV is still a lossy format. It cannot properly describe field settings, defaults, images, or every future sorter.ly feature. A versioned sorter.ly file format will eventually handle those jobs.

Spreadsheet formula injection also needs an explicit export policy before CSV is treated as a perfectly safe round trip. Escaping formulas can change user data, while not escaping them can surprise spreadsheet software. That trade-off deserves a deliberate patch, not a mysterious apostrophe added somewhere at 2 a.m.

## Migrations

`db/schema.ts` is the current schema, and `drizzle/` is the path used to get old databases there.

The rule is:

- developers change the schema and generate a migration
- the generated SQL gets reviewed and tested
- migration files and snapshots are committed
- users run `npm run db:migrate`, which applies the committed files through Drizzle's runtime migrator and checks the result
- users do not generate their own mystery migrations during installation
- released migrations are append-only

The migration chain is tested against both a new database and a v0.1.1-shaped database containing real rows. v0.1.3 rebuilds `fields`, preserves every existing field, and seeds version-1 empty configuration. If the older integrity migration finds a cross-collection legacy value, it still refuses to continue instead of "fixing" the problem by deleting data and hoping nobody notices.

Automatic backups should arrive before migrations become more ambitious, especially before image storage and field conversion.

## Field kinds, storage, and configuration

A field has three separate ideas hiding inside it:

- **kind:** what the user interacts with, such as a rating
- **storage type:** how SQLite stores it, such as a number
- **configuration:** maximum rating, decimal precision, default value, and similar options

A rating is now a number-backed field with rating-specific configuration. It did not receive a fifth value column just because it got nicer buttons.

Defaults also live in validated field configuration. Manual entry and CSV import apply the same rule, while record editing deliberately does not backfill blank values.

Images are different. They need managed asset files, stable IDs, relative paths, size and format limits, thumbnails, backups, and deletion rules. Absolute file paths and giant blobs in `record_values` are both future regret generators.

## macOS and iOS

The current app depends on Next.js Server Components, Server Actions, a Node.js process, and native `better-sqlite3`. It cannot become an iPhone app by putting a Tauri sticker on `next.config.ts`.

The useful shared piece is the plain TypeScript core. Apple recommends keeping local app data in the platform's designated container and fetching only the data a screen needs; both reinforce sorter.ly's existing direction. The reasonable order is:

1. Keep moving data rules into `core/` only when a real feature needs them.
2. Keep SQLite operations behind small deliberate adapter functions.
3. Define the application data directory, backup format, and asset storage.
4. Build a small macOS proof of concept with a native SQLite adapter.
5. Test file import/export, sandboxing, signing, and storage on iOS.
6. Decide how much of the React interface can be shared without rebuilding Next.js inside a trench coat.

Tauri 2 is a candidate, not a blood oath. The proof of concept gets to decide.

Native support and cloud sync are separate projects. A Mac or iOS version should be fully useful offline before an account system gets anywhere near it.

## Tests

The test suite uses Node's built-in test runner and the `tsx` package that was already installed.

The current tests cover:

- CSV parsing edge cases
- all five field kinds and four storage types
- versioned field configuration parsing and invalid shapes
- rating maximums, decimal precision, and numeric storage
- defaults during normalization, plus invalid defaults
- required and invalid values
- a fresh migration
- a v0.1.1 upgrade with preserved data
- cross-collection rejection
- invalid multi-type value rejection
- transaction rollback
- refusing an unsafe legacy upgrade
- preserving old fields while adding v0.1.3 configuration

The v0.1.3 release check also drives a real headless browser through field setup, manual defaults, rating entry, filters, editing, CSV export/import, incompatible setting rejection, and cleanup. No browser-testing dependency was added to the product just to prove the browser exists.

`npm run db:migrate` applies committed migrations with foreign keys safely paused for SQLite table rebuilds, then turns them back on and checks the result. `npm run check:db` checks SQLite integrity, foreign keys, and whether the migration table exists.

No new testing dependency was needed. That is always a pleasant sentence.

## Choices we are keeping

- SQLite and Drizzle stay.
- The typed value model stays.
- Next.js stays for the local web app through v0.1.x.
- The core stays small and plain instead of becoming an enterprise architecture cosplay convention.
- Cloud features remain optional and separate from local mode.
- Sync remains separate from simply running the app on another kind of device.

## Known work for later

- SQL-backed sorting, filtering, and pagination
- user-visible import previews and detailed validation results
- local backups, restore, trash, or undo
- field rename, reorder, and safe conversion
- a versioned sorter.ly interchange format
- an image asset system
- CSV formula handling
- a proper packaged data directory
- native prototypes
- eventually, sync conflict rules and encryption

Those are distributed across `SCOPE.md`. They should arrive as understandable patches, not one update called "everything everywhere all at once."

## Useful reference pages

- Next.js request-time SQLite reads: https://nextjs.org/docs/app/api-reference/functions/connection
- Next.js hostname options: https://nextjs.org/docs/app/api-reference/cli/next
- Next.js data security and data access layers: https://nextjs.org/docs/app/guides/data-security
- Drizzle migration generation: https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle migration application: https://orm.drizzle.team/docs/drizzle-kit-migrate
- Drizzle transactions: https://orm.drizzle.team/docs/transactions
- SQLite JSON functions: https://www.sqlite.org/json1.html
- SQLite query planner: https://www.sqlite.org/queryplanner.html
- Apple data management: https://developer.apple.com/documentation/technologyoverviews/data-management
- Apple files and app containers: https://developer.apple.com/documentation/technologyoverviews/files-and-directories
- Tauri and Next.js limitations: https://v2.tauri.app/start/frontend/nextjs/
- Tauri SQL plugin platforms: https://v2.tauri.app/plugin/sql/
