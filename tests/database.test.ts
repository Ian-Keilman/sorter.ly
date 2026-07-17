import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const migrationPaths = [
  "drizzle/0000_gray_blackheart.sql",
  "drizzle/0001_foundation_integrity.sql",
];

function readMigration(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replaceAll(
    "--> statement-breakpoint",
    ""
  );
}

function createTemporaryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "sorterly-test-"));
  const database = new Database(join(directory, "sorterly.db"));
  database.pragma("foreign_keys = ON");

  return {
    database,
    close() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function applyMigration(database: Database.Database, index: number) {
  database.exec(readMigration(migrationPaths[index]));
}

function insertCollection(database: Database.Database, id: string) {
  database
    .prepare("INSERT INTO collections (id, name, slug) VALUES (?, ?, ?)")
    .run(id, id, id);
}

function insertField(
  database: Database.Database,
  id: string,
  collectionId: string,
  type = "text"
) {
  database
    .prepare(
      "INSERT INTO fields (id, collection_id, name, key, type, required, position) VALUES (?, ?, ?, ?, ?, 0, 0)"
    )
    .run(id, collectionId, id, id, type);
}

function insertRecord(
  database: Database.Database,
  id: string,
  collectionId: string
) {
  database
    .prepare("INSERT INTO records (id, collection_id) VALUES (?, ?)")
    .run(id, collectionId);
}

test("migrations build a healthy database and preserve v0.1.1 data", () => {
  const temporary = createTemporaryDatabase();

  try {
    applyMigration(temporary.database, 0);
    insertCollection(temporary.database, "c1");
    insertField(temporary.database, "f1", "c1");
    insertRecord(temporary.database, "r1", "c1");
    temporary.database
      .prepare(
        "INSERT INTO record_values (id, record_id, field_id, text_value) VALUES ('v1', 'r1', 'f1', 'Gumdrops')"
      )
      .run();

    applyMigration(temporary.database, 1);

    const migratedValue = temporary.database
      .prepare(
        "SELECT collection_id, text_value FROM record_values WHERE id = 'v1'"
      )
      .get();

    assert.deepEqual(migratedValue, {
      collection_id: "c1",
      text_value: "Gumdrops",
    });
    assert.equal(temporary.database.pragma("integrity_check", { simple: true }), "ok");
    assert.deepEqual(temporary.database.pragma("foreign_key_check"), []);
  } finally {
    temporary.close();
  }
});
test("the database rejects invalid field and record value states", () => {
  const temporary = createTemporaryDatabase();

  try {
    for (let i = 0; i < migrationPaths.length; i += 1) {
      applyMigration(temporary.database, i);
    }

    insertCollection(temporary.database, "c1");
    insertCollection(temporary.database, "c2");
    insertField(temporary.database, "f1", "c1");
    insertField(temporary.database, "f2", "c2");
    insertRecord(temporary.database, "r1", "c1");

    temporary.database
      .prepare(
        "INSERT INTO record_values (id, collection_id, record_id, field_id, text_value) VALUES ('valid', 'c1', 'r1', 'f1', 'Gumdrops')"
      )
      .run();

    assert.throws(() => {
      temporary.database
        .prepare(
          "INSERT INTO record_values (id, collection_id, record_id, field_id, text_value) VALUES ('cross', 'c1', 'r1', 'f2', 'Nope')"
        )
        .run();
    }, /FOREIGN KEY constraint failed/);

    assert.throws(() => {
      temporary.database
        .prepare(
          "INSERT INTO record_values (id, collection_id, record_id, field_id, text_value, number_value) VALUES ('multi', 'c1', 'r1', 'f1', 'Nope', 1)"
        )
        .run();
    }, /record_values_exactly_one_value_check/);

    assert.throws(() => {
      insertField(temporary.database, "bad-field", "c1", "mystery");
    }, /fields_type_check/);
  } finally {
    temporary.close();
  }
});

test("an invalid replacement rolls back instead of deleting the old value", () => {
  const temporary = createTemporaryDatabase();

  try {
    for (let i = 0; i < migrationPaths.length; i += 1) {
      applyMigration(temporary.database, i);
    }

    insertCollection(temporary.database, "c1");
    insertField(temporary.database, "f1", "c1");
    insertRecord(temporary.database, "r1", "c1");
    temporary.database
      .prepare(
        "INSERT INTO record_values (id, collection_id, record_id, field_id, text_value) VALUES ('old', 'c1', 'r1', 'f1', 'Original')"
      )
      .run();

    const replaceValue = temporary.database.transaction(() => {
      temporary.database
        .prepare("DELETE FROM record_values WHERE record_id = 'r1'")
        .run();
      temporary.database
        .prepare(
          "INSERT INTO record_values (id, collection_id, record_id, field_id, text_value, number_value) VALUES ('bad', 'c1', 'r1', 'f1', 'Broken', 1)"
        )
        .run();
    });

    assert.throws(() => replaceValue(), /record_values_exactly_one_value_check/);

    const value = temporary.database
      .prepare("SELECT text_value FROM record_values WHERE id = 'old'")
      .get();
    assert.deepEqual(value, { text_value: "Original" });
  } finally {
    temporary.close();
  }
});

test("the upgrade refuses legacy cross-collection values instead of dropping them", () => {
  const temporary = createTemporaryDatabase();

  try {
    applyMigration(temporary.database, 0);
    insertCollection(temporary.database, "c1");
    insertCollection(temporary.database, "c2");
    insertField(temporary.database, "f1", "c1");
    insertRecord(temporary.database, "r2", "c2");
    temporary.database
      .prepare(
        "INSERT INTO record_values (id, record_id, field_id, text_value) VALUES ('cross', 'r2', 'f1', 'Nope')"
      )
      .run();

    assert.throws(
      () => applyMigration(temporary.database, 1),
      /NOT NULL constraint failed/
    );
  } finally {
    temporary.close();
  }
});
