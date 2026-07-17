# Patch Notes

## v0.1.2

- Made record creation/editing and field deletion/reordering atomic. Either the whole change works or SQLite puts everything back where it found it.
- Added server-side validation for required fields, numbers, dates, and booleans.
- Made manual record entry and CSV import use the same value rules.
- Added database protection against cross-collection values, invalid field types, and value rows trying to be several types at once.
- Added a safe migration from the v0.1.1 database shape.
- Added a 5 MB and 10,000-row CSV import limit, plus visible import errors.
- Bound the normal development and production commands to the local computer by default.
- Made SQLite-backed pages render from current request-time data.
- Added the first automated tests for core rules, CSV parsing, transactions, constraints, and migrations.
- Added ARCHITECTURE.md, partly because relying on archaeological code comments forever seemed unwise.

## v0.1.1

- Added collection renaming and description editing.
- Added a home dashboard and linked the sorter.ly brand to it.
- Added confirmation before deleting collections, fields, or records.
- Made CSV imports atomic and preserved duplicate-header columns with unique names.
- Corrected the default local database path and aligned package version metadata.
