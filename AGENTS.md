# sorter.ly Development Rules

This file records the owner's standing instructions for anyone developing sorter.ly.

## Product direction

- sorter.ly is a local-first customizable collection/database manager.
- Collections are private by default and contain custom fields and records.
- Fast sorting, filtering, and CSV import/export are product priorities.
- Keep the UI minimal, utilitarian, and easy to use.
- Do not add collaboration or cloud requirements to local mode.
- Prefer practical, readable code and avoid unnecessary abstraction or dependencies.
- Preserve the current style and structure unless there is a strong reason to change it.

Read `SCOPE.md` and `ARCHITECTURE.md` thoroughly before planning product or architecture changes.

## Working method

1. Inspect the current code and summarize the architecture before changing it.
2. Treat the current repository state as the source of truth.
3. Explain the exact files that will change and why before coding.
4. Make targeted edits; do not rewrite whole files unless necessary.
5. Keep naming and product copy consistent with the repository.
6. Update related create, edit, filter, import, and export flows when a feature affects them.
7. Update the migration workflow whenever the schema changes.
8. Test in proportion to risk and preserve existing working features.
9. After coding, report what changed, how it was tested, and remaining risks.
10. Ask before making a material product decision that the existing code and documentation do not answer.

## Version and release protocol

Each new version is developed on its own version branch, such as `v0.1.2` or `v0.1.3`.

For every release:

1. Start the new version branch from the released `main` branch.
2. Develop and test the release on that version branch.
3. Update `HOWTOUSE.md`, `INSTALLATIONGUIDE.md`, `PATCHNOTES.md`, `README.md`, `SCOPE.md`, and `ARCHITECTURE.md` as needed while preserving their existing style and unchanged history.
4. Commit and push the complete version branch.
5. Fast-forward `main` to the tested version commit and push it.
6. Create and push the annotated version tag.
7. Keep all previous release branches and tags. Never delete, rewrite, or repurpose them.

The preserved branch for the original release is `v0.1.0-initial-release`. The v0.1.1 release remains on `v0.1.1`. Their code and documentation are historical snapshots and must remain intact.
