/* compatibility with Microsoft Excel and Google Sheets, hopefully */


import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../../../db";
import {
  collections,
  fields,
  records,
  recordValues,
} from "../../../../db/schema";

type ValueCell = {
  textValue: string | null;
  numberValue: number | null;
  dateValue: string | null;
  booleanValue: boolean | null;
};

function getCsvCell(fieldType: string, value: ValueCell | undefined) {
  if (!value) {
    return "";
  }

  if (fieldType === "text") {
    return value.textValue ?? "";
  }

  if (fieldType === "number") {
    return value.numberValue !== null ? String(value.numberValue) : "";
  }

  if (fieldType === "date") {
    return value.dateValue ?? "";
  }

  if (fieldType === "boolean") {
    if (value.booleanValue === true) {
      return "true";
    }

    if (value.booleanValue === false) {
      return "false";
    }

    return "";
  }

  return "";
}

function escapeCsv(value: string) {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  const { collectionId } = await params;

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  if (!collection) {
    return new Response("Not found", { status: 404 });
  }

  const fieldRows = db
    .select()
    .from(fields)
    .where(eq(fields.collectionId, collectionId))
    .orderBy(asc(fields.position))
    .all();

  const recordRows = db
    .select()
    .from(records)
    .where(eq(records.collectionId, collectionId))
    .orderBy(asc(records.createdAt))
    .all();

  const valueRows =
    recordRows.length === 0
      ? []
      : db
          .select()
          .from(recordValues)
          .where(
            inArray(
              recordValues.recordId,
              recordRows.map((record) => record.id)
            )
          )
          .all();

  const valueMap = new Map<string, ValueCell>();

  for (const valueRow of valueRows) {
    valueMap.set(`${valueRow.recordId}:${valueRow.fieldId}`, {
      textValue: valueRow.textValue,
      numberValue: valueRow.numberValue,
      dateValue: valueRow.dateValue,
      booleanValue: valueRow.booleanValue,
    });
  }

  const lines: string[] = [];

  lines.push(fieldRows.map((field) => escapeCsv(field.name)).join(","));

  for (const record of recordRows) {
    const row = fieldRows.map((field) => {
      const value = valueMap.get(`${record.id}:${field.id}`);
      return escapeCsv(getCsvCell(field.type, value));
    });

    lines.push(row.join(","));
  }

  const csv = `\uFEFF${lines.join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${collection.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}