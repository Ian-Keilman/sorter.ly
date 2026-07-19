## Scope of sorter.ly

This is the current order I want to build things in. It will probably change sometimes because software roadmaps are written in pencil, even when the file extension says Markdown.

#### v0.1.2 - Make the foundation less scary

- Make record and field changes atomic, so an error cannot leave half a record behind.
- Enforce required fields and typed values on the server instead of trusting the browser with our entire legal system.
- Stop records and fields from different collections from being connected in the database.
- Share record parsing and validation between manual entry and CSV imports.
- Add CSV size/row limits and stop an invalid import before it changes anything.
- Make database pages read current data at request time instead of whatever existed during the build.
- Keep the local server on the local computer by default.
- Start an actual test suite for the core rules, transactions, and migrations.
- Document how the architecture works, partly so Future Me cannot claim nobody told him.

#### v0.1.3 - Ratings and defaults

- Add a rating field. Instead of typing a number into a regular box, you can use a quick rating control out of 5, 10, or 100. Decimals should work.
- Store ratings as numbers with rating-specific settings. I do not want a brand-new database column every time a field gets a nicer outfit.
- Add default field values, especially for booleans.
- Make defaults behave the same during manual entry and CSV import.
- Apply defaults to new records and blank imported cells, without quietly rewriting old records because a setting changed on Tuesday.
- Reject rating-setting changes that would make existing ratings invalid.

#### v0.1.4 - Duplicates and better importing

- Detect duplicate records during manual entry and CSV import.
- Let each collection decide which fields count when defining a duplicate.
- Add an option to ignore duplicate rows.
- Add an import preview with validation results and a summary before the database changes.

#### v0.1.5 - Field housekeeping and large collections

- Rename and reorder fields.
- Safely convert compatible field types, with a preview before doing anything irreversible.
- Move sorting and filtering into SQLite.
- Add pagination so a giant collection does not ask the browser to render the known universe at once.
- Add saved filters/views if the basic query system feels solid.

#### v0.1.6 - Images

- Add an image field for small JPG and PNG images to start.
- Store images as managed assets with thumbnails, size limits, and deletion rules.
- Include images in backups and the future sorter.ly file format.
- Larger images, more formats, and video can wait until the small version proves it is not secretly a disaster.

#### v0.1.7 - Grid navigation

- Add rows and columns of square record cards instead of only a table.
- Clicking a card should show that record's fields and values.
- This is partly for images and partly because I want navigation similar to modern Dance Dance Revolution, which is somehow a real architecture requirement now.
- Keep the table view too, because spreadsheets have survived this long for a reason.

#### v0.1.8 - The "real product" UI patch

- Improve the overall UI/UX so sorter.ly looks like a real product instead of a "please give me internships" project.
- Improve typography, spacing, responsive behavior, keyboard use, and accessibility.
- Add a proper in-app how-to-use page.
- Give the home page more of a reason to exist.

#### v0.1.9 - Backups and sorter.ly files

- Add automatic local backups and a clear restore process.
- Add trash, undo, or both before more destructive editing gets ambitious.
- Define a versioned sorter.ly file format that contains collection settings, fields, records, and images.
- Pick a file extension that does not sound like it was named by a committee.
- Keep CSV because normal people still need to open things in Excel and Sheets.

#### v0.2.0 - Native groundwork and macOS preview

- Define proper application data folders instead of assuming the repository is the app forever.
- Keep moving shared rules behind a small platform-neutral core.
- Build a macOS proof of concept with native SQLite storage.
- Evaluate Tauri 2, but let the proof of concept decide instead of emotionally committing to a framework logo.

#### v0.3.0 - Accounts and optional sync

- Add an online website with accounts and passwords.
- Keep local-only mode. It is not a trial version of cloud mode.
- Define encryption and sync-conflict rules before uploading anybody's data anywhere.
- Sync should be optional and should not be required just to use another device.

#### v1.0.0

- Stable desktop and mobile releases.
- Windows, macOS, iOS, and hopefully Android.
- You should be able to use sorter.ly on a home computer, phone, tablet, or laptop without the product forgetting why it was made.

#### v1.1.0

- AI, someday.
- Only if it does something genuinely useful and not because every app apparently needs a glowing button now.

## Ideas without a version yet

- More import/export formats if people actually need them.
- CSV formula-safety options.
- Better backup scheduling and portable archives.
- Collection templates.
- Bulk record editing.
- Better keyboard-only navigation.
- Performance benchmarks with genuinely large collections.
- Conflict history for sync.

The main rule is to ship these as understandable patches. sorter.ly does not need an update whose patch notes are just "we changed everything; good luck."
