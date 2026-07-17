# sorter.ly

**Current version: v0.1.1**

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

This one:

- runs locally
- is private
- is customizable
- supports CSV import/export (files often used in Excel and Sheets)

Things like collaboration, storing data in the cloud, and iOS and Android support are currently out of the scope for v0.1.1.

## Tech Stack

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- Tailwind / minimal custom styling

## Getting Started

- See INSTALLATIONGUIDE.md for instructions on how to install
- See HOWTOUSE.md for instructions on how to use
- See ARCHITECTURE.md for the current system design and technical direction

## v0.1.1

- Rename collections and edit their descriptions
- Return home by clicking the sorter.ly brand
- View collection, field, and record totals on the home page
- Safer destructive actions and more reliable CSV imports
