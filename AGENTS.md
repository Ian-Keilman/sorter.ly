# Notes for whoever is working on sorter.ly

This file is mostly for Codex and any future coding assistant so I do not have to explain the entire project ritual every single time.

## What sorter.ly is supposed to be

- A local-first collection/database manager.
- Private by default.
- Customizable without becoming confusing.
- Fast at sorting, filtering, importing, and exporting.
- Minimal and utilitarian, but still something that looks like a real product instead of a "please give me an internship" project.
- Fully useful without an account, internet connection, or cloud subscription politely asking for $14.99 a month.

Do not turn this into a generic enterprise app. Practical code beats clever code, and a small readable function beats a framework invented specifically for that function.

Read `SCOPE.md` and `ARCHITECTURE.md` before planning anything substantial.

## How I want changes handled

1. Inspect the current code first. The repository is the source of truth, even if an old chat says something different.
2. Explain what was found before changing it.
3. Say exactly which files will change and why.
4. Make targeted edits. Do not replace an entire file just because replacing it is easier for a robot.
5. Keep names, UI copy, and comments in the existing sorter.ly style.
6. If a feature affects create, edit, filter, import, or export, check all of those paths.
7. If the schema changes, update and test the migration too. The database is not going to migrate itself through positive thinking.
8. Avoid dependencies unless they clearly earn their place.
9. Run tests in proportion to the risk, then explain exactly what passed.
10. Call out architectural problems instead of quietly building more floors on top of them.
11. Ask before making a product decision that meaningfully changes what sorter.ly is.

## The version ritual (this part is important)

Every release gets its own branch, such as `v0.1.2`, `v0.1.3`, and so on.

For each release:

1. Start the version branch from the released `main` branch.
2. Build and test the whole release on that branch.
3. Update `HOWTOUSE.md`, `INSTALLATIONGUIDE.md`, `PATCHNOTES.md`, `README.md`, `SCOPE.md`, and `ARCHITECTURE.md` where needed. Keep the original tone and do not rewrite history for sport.
4. Commit and push the complete version branch.
5. Fast-forward `main` to the exact tested commit and push it.
6. Create and push an annotated version tag.
7. Keep every old release branch and tag. Do not delete, rewrite, recycle, or "clean up" history.

`v0.1.0-initial-release` preserves the original release. `v0.1.1` preserves v0.1.1. They include the code and all the documentation from those points in time, which is the entire reason they exist.

Do not move `main` or create the release tag until the version branch has passed its full release checks. "It probably works" is not a release check.
