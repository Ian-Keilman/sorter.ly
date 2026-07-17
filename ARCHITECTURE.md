# How sorter.ly is put together

This is the architecture document for sorter.ly, current as of v0.1.2.

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
        -> shared record rules
           -> Drizzle ORM
              -> better-sqlite3
                 -> one local SQLite file
```

The app runs as one local Node.js process. The browser talks to it on `127.0.0.1`, and that process reads and writes the database.

There is no remote API, account system, background worker, or cloud database right now. This is intentional. sorter.ly is a collection manager, not a distributed-systems group project.

## Where things live

- `app/` contains pages, components, Server Actions, and the CSV export route.
- `core/` contains plain TypeScript data rules that do not depend on Next.js, Drizzle, Node.js, or the browser.
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

One row per custom field. A field belongs to a collection and has a name, stable key, type, required flag, and position.

The current field types are:

- text
- number
- date
- boolean

SQLite now checks that a field cannot claim to be a made-up fifth type because a buggy import had a creative afternoon.

### `records`

One row per entry in a collection. The row mainly supplies identity, collection ownership, and timestamps.

### `record_values`

This is the slightly unusual table that makes custom fields possible. Each row connects one record to one field and stores the value in one of four typed columns:

- `text_value`
- `number_value`
- `date_value`
- `boolean_value`

Four nullable columns may look mildly cursed at first glance, but it gives SQLite real numeric and boolean values instead of shoving everything into text. v0.1.2 makes the bargain explicit: exactly one of those columns must contain a value.

The table also stores `collection_id`. That looks redundant, and technically it is, but it lets SQLite prove that the record and field belong to the same collection. A little duplication is better than a value escaping into somebody else's collection and pretending nothing happened.

## Database rules

The database now protects these rules:

- fields and records belong to real collections
- a record value's record and field belong to the same collection
- one record/field pair has at most one value row
- exactly one typed value column is populated
- boolean values are `0`, `1`, or empty
- field types are one of the four supported types
- required flags are valid booleans
- deleting a collection, field, or record removes its dependent data

The application protects the rules too. Database constraints are the final seatbelt, not the steering wheel.

## Reading data

Pages currently query Drizzle directly. The collection page loads a collection's fields, records, and values, builds the table in memory, then sorts and filters in JavaScript.

That is understandable and perfectly adequate for small collections. It is not the final answer for the "fast sorting and filtering" part of sorter.ly.

All synchronous database reads now wait for an actual request. This prevents a production build from accidentally turning the home page into a photograph of whatever happened to be in SQLite during `npm run build`.

The later large-collection patch should move filtering, sorting, and pagination into a small database query layer. It should be driven by real query plans and benchmarks rather than adding seventeen indexes because they looked lonely.

## Changing data

Server Actions still deal with Next.js things such as `FormData`, redirects, and page revalidation.

The actual record value rules live in `core/record-values.ts`. Manual record forms and CSV import both use the same code for:

- trimming text
- parsing finite numbers
- checking ISO dates
- parsing booleans
- enforcing required fields

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
- imports everything in one transaction
- changes nothing if any row is invalid

Export quotes ordinary CSV values correctly and includes a UTF-8 BOM for spreadsheet compatibility.

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

The v0.1.2 migration is tested against both a new database and a v0.1.1-shaped database containing real rows. It copies valid old values into the safer schema. If it finds a cross-collection legacy value, it refuses to continue instead of "fixing" the problem by deleting data and hoping nobody notices.

Automatic backups should arrive before migrations become more ambitious, especially before image storage and field conversion.

## Future field types

A field has three separate ideas hiding inside it:

- **kind:** what the user interacts with, such as a rating
- **storage type:** how SQLite stores it, such as a number
- **configuration:** maximum rating, decimal precision, default value, and similar options

A rating should be a number-backed field with rating-specific configuration. It does not need a fifth value column just because it gets nicer buttons.

Defaults also belong to validated field configuration. Manual entry and CSV import must apply the same rule.

Images are different. They need managed asset files, stable IDs, relative paths, size and format limits, thumbnails, backups, and deletion rules. Absolute file paths and giant blobs in `record_values` are both future regret generators.

## macOS and iOS

The current app depends on Next.js Server Components, Server Actions, a Node.js process, and native `better-sqlite3`. It cannot become an iPhone app by putting a Tauri sticker on `next.config.ts`.

The useful shared piece is the plain TypeScript core. The reasonable order is:

1. Keep moving data rules into `core/` only when a real feature needs them.
2. Keep SQLite operations behind small deliberate adapter functions.
3. Define the application data directory, backup format, and asset storage.
4. Build a small macOS proof of concept with a native SQLite adapter.
5. Test file import/export, sandboxing, signing, and storage on iOS.
6. Decide how much of the React interface can be shared without rebuilding Next.js inside a trench coat.

Tauri 2 is a candidate, not a blood oath. The proof of concept gets to decide.

Native support and cloud sync are separate projects. A Mac or iOS version should be fully useful offline before an account system gets anywhere near it.

## Tests

v0.1.2 starts the test suite with Node's built-in test runner and the `tsx` package that was already installed.

The current tests cover:

- CSV parsing edge cases
- all four record value types
- required and invalid values
- a fresh migration
- a v0.1.1 upgrade with preserved data
- cross-collection rejection
- invalid multi-type value rejection
- transaction rollback
- refusing an unsafe legacy upgrade

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
- Drizzle migration generation: https://orm.drizzle.team/docs/drizzle-kit-generate
- Drizzle migration application: https://orm.drizzle.team/docs/drizzle-kit-migrate
- Tauri and Next.js limitations: https://v2.tauri.app/start/frontend/nextjs/
- Tauri SQL plugin platforms: https://v2.tauri.app/plugin/sql/
