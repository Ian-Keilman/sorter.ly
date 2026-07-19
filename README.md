# sorter.ly

**Current version: v0.1.3**

## About

Locally-stored, highly customizable database manager

Think of McMaster-Carr, but this one you can use for any reason you want.

sorter.ly lets you create "collections" (individual databases) and organize data within them however you feel.
Simply click to create a collection, add as many "fields" (parameters) as you'd like, and start adding entries.

## Why

Most tools that do this sort of thing either:
- cost money
- require internet access
- (probably) share your data
- aren't very customizable
- slowly turn your personal list of candy into a team productivity platform

This one:

- runs locally
- is private
- is customizable
- supports CSV import/export (files often used in Excel and Sheets)

Things like collaboration, storing data in the cloud, and iOS and Android support are still out of scope for v0.1.3. I want the local version to be dependable before asking it to become a social network.

## Tech Stack

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- Tailwind / minimal custom styling

## Getting Started

- See INSTALLATIONGUIDE.md for instructions on how to install
- See HOWTOUSE.md for instructions on how to use
- See ARCHITECTURE.md if you want to know what is happening under the floorboards

## v0.1.3

- Rating fields with quick controls out of 5, 10, or 100
- Whole, half, tenth, and hundredth rating precision
- Default values for every field type, including booleans that can finally begin life as "Yes"
- The same defaults during manual record creation and CSV import
- Versioned field configuration stored separately from record values, so ratings still use the normal number column instead of demanding custom furniture

## v0.1.2

- Safer database rules and atomic record/field changes
- Shared validation for record forms and CSV imports
- CSV import limits and useful errors instead of silent skipped values
- Local-only server binding by default
- Request-time database reads and the first automated test suite
- Architecture documentation, because "I think this is how it works" is not a long-term strategy

## v0.1.1

- Rename collections and edit their descriptions
- Return home by clicking the sorter.ly brand
- View collection, field, and record totals on the home page
- Safer destructive actions and more reliable CSV imports
