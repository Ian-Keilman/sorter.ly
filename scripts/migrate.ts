import "dotenv/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "../db";
import migrationJournal from "../drizzle/meta/_journal.json";

sqlite.pragma("foreign_keys = OFF");

try {
  migrate(db, { migrationsFolder: "./drizzle" });
} finally {
  sqlite.pragma("foreign_keys = ON");
}

const integrity = sqlite.pragma("integrity_check", { simple: true });
const foreignKeyIssues = sqlite.pragma("foreign_key_check") as unknown[];
const appliedMigrationCount = (
  sqlite
    .prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations")
    .get() as { count: number }
).count;

if (integrity !== "ok") {
  throw new Error(`Database integrity check failed: ${String(integrity)}`);
}

if (foreignKeyIssues.length > 0) {
  throw new Error(
    `Database foreign-key check found ${foreignKeyIssues.length} issue(s).`
  );
}

if (appliedMigrationCount !== migrationJournal.entries.length) {
  throw new Error(
    `Expected ${migrationJournal.entries.length} applied migration(s), found ${appliedMigrationCount}.`
  );
}

console.log("Database migrations applied.");
console.log("integrity check:", integrity);
console.log("foreign-key issues:", foreignKeyIssues.length);
console.log(
  "applied migrations:",
  `${appliedMigrationCount}/${migrationJournal.entries.length}`
);

sqlite.close();
