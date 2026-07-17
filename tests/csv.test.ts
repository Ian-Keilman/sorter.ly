import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv } from "../core/csv";

test("parses BOM, quoted commas, escaped quotes, and CRLF rows", () => {
  const rows = parseCsv(
    '\uFEFFName,Notes\r\nGumdrops,"Sweet, but weird"\r\nChocolate,"Says ""hi"""'
  );

  assert.deepEqual(rows, [
    ["Name", "Notes"],
    ["Gumdrops", "Sweet, but weird"],
    ["Chocolate", 'Says "hi"'],
  ]);
});
test("removes fully blank rows without removing blank cells", () => {
  assert.deepEqual(parseCsv("Name,Price\n\nGumdrops,"), [
    ["Name", "Price"],
    ["Gumdrops", ""],
  ]);
});

test("rejects an unclosed quoted value", () => {
  assert.throws(() => parseCsv('Name\n"Gumdrops'), /unclosed quoted value/);
});
