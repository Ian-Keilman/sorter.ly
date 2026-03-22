import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { deleteCollection } from "../../actions/collections";
import { deleteRecord } from "../../actions/records";
import { db } from "../../../db";
import {
  collections,
  fields,
  records,
  recordValues,
} from "../../../db/schema";

type CollectionPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ValueCell = {
  textValue: string | null;
  numberValue: number | null;
  dateValue: string | null;
  booleanValue: boolean | null;
};

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatCellValue(fieldType: string, value: ValueCell | undefined) {
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
      return "Yes";
    }

    if (value.booleanValue === false) {
      return "No";
    }

    return "";
  }

  return "";
}

function getSortableValue(fieldType: string, value: ValueCell | undefined) {
  if (!value) {
    return null;
  }

  if (fieldType === "text") {
    const text = value.textValue?.trim() ?? "";
    return text === "" ? null : text.toLowerCase();
  }

  if (fieldType === "number") {
    return value.numberValue;
  }

  if (fieldType === "date") {
    const date = value.dateValue?.trim() ?? "";
    return date === "" ? null : date;
  }

  if (fieldType === "boolean") {
    return value.booleanValue;
  }

  return null;
}

function compareValues(
  a: string | number | boolean | null,
  b: string | number | boolean | null,
  dir: "asc" | "desc"
) {
  if (a === null && b === null) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  let result = 0;

  if (typeof a === "string" && typeof b === "string") {
    result = a.localeCompare(b);
  }

  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    result = Number(a) - Number(b);
  }

  return dir === "asc" ? result : -result;
}

function nextDir(
  activeSortFieldId: string | null,
  currentDir: "asc" | "desc",
  fieldId: string
) {
  if (activeSortFieldId !== fieldId) {
    return "asc";
  }

  return currentDir === "asc" ? "desc" : "asc";
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { collectionId } = await params;
  const rawSearchParams = await searchParams;

  const currentParams = new URLSearchParams();

  for (const [key, value] of Object.entries(rawSearchParams)) {
    const singleValue = getSingleParam(value);

    if (typeof singleValue === "string" && singleValue !== "") {
      currentParams.set(key, singleValue);
    }
  }

  const buildHref = (updates: Record<string, string | null | undefined>) => {
    const paramsCopy = new URLSearchParams(currentParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") {
        paramsCopy.delete(key);
      } else {
        paramsCopy.set(key, value);
      }
    }

    const queryString = paramsCopy.toString();

    if (!queryString) {
      return `/collections/${collectionId}`;
    }

    return `/collections/${collectionId}?${queryString}`;
  };

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  if (!collection) {
    notFound();
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

  const activeField =
    typeof currentParams.get("sort") === "string"
      ? fieldRows.find((field) => field.id === currentParams.get("sort")) ?? null
      : null;

  const activeDir: "asc" | "desc" =
    currentParams.get("dir") === "desc" ? "desc" : "asc";

  const hasActiveFilters = fieldRows.some((field) => {
    return (
      (currentParams.get(`f_${field.id}`) ?? "") !== "" ||
      (currentParams.get(`min_${field.id}`) ?? "") !== "" ||
      (currentParams.get(`max_${field.id}`) ?? "") !== "" ||
      (currentParams.get(`from_${field.id}`) ?? "") !== "" ||
      (currentParams.get(`to_${field.id}`) ?? "") !== "" ||
      (currentParams.get(`bool_${field.id}`) ?? "") !== ""
    );
  });

  const filteredRecordRows = recordRows.filter((record) => {
    for (const field of fieldRows) {
      const value = valueMap.get(`${record.id}:${field.id}`);

      if (field.type === "text") {
        const query = (currentParams.get(`f_${field.id}`) ?? "")
          .trim()
          .toLowerCase();

        if (query !== "") {
          const cellText = (value?.textValue ?? "").toLowerCase();

          if (!cellText.includes(query)) {
            return false;
          }
        }
      }

      if (field.type === "number") {
        const minText = (currentParams.get(`min_${field.id}`) ?? "").trim();
        const maxText = (currentParams.get(`max_${field.id}`) ?? "").trim();

        const min = minText === "" ? null : Number(minText);
        const max = maxText === "" ? null : Number(maxText);

        if (min !== null || max !== null) {
          const numberValue = value?.numberValue ?? null;

          if (numberValue === null) {
            return false;
          }

          if (min !== null && Number.isFinite(min) && numberValue < min) {
            return false;
          }

          if (max !== null && Number.isFinite(max) && numberValue > max) {
            return false;
          }
        }
      }

      if (field.type === "date") {
        const from = (currentParams.get(`from_${field.id}`) ?? "").trim();
        const to = (currentParams.get(`to_${field.id}`) ?? "").trim();

        if (from !== "" || to !== "") {
          const dateValue = value?.dateValue ?? "";

          if (dateValue === "") {
            return false;
          }

          if (from !== "" && dateValue < from) {
            return false;
          }

          if (to !== "" && dateValue > to) {
            return false;
          }
        }
      }

      if (field.type === "boolean") {
        const boolFilter = (currentParams.get(`bool_${field.id}`) ?? "").trim();

        if (boolFilter !== "") {
          const boolValue = value?.booleanValue ?? null;

          if (boolFilter === "true" && boolValue !== true) {
            return false;
          }

          if (boolFilter === "false" && boolValue !== false) {
            return false;
          }
        }
      }
    }

    return true;
  });

  const sortedRecordRows = [...filteredRecordRows];

  if (activeField) {
    sortedRecordRows.sort((recordA, recordB) => {
      const valueA = valueMap.get(`${recordA.id}:${activeField.id}`);
      const valueB = valueMap.get(`${recordB.id}:${activeField.id}`);

      const sortableA = getSortableValue(activeField.type, valueA);
      const sortableB = getSortableValue(activeField.type, valueB);

      const primary = compareValues(sortableA, sortableB, activeDir);

      if (primary !== 0) {
        return primary;
      }

      return recordA.createdAt.localeCompare(recordB.createdAt);
    });
  }

  const clearFilterUpdates = Object.fromEntries(
    fieldRows.flatMap((field) => [
      [`f_${field.id}`, null],
      [`min_${field.id}`, null],
      [`max_${field.id}`, null],
      [`from_${field.id}`, null],
      [`to_${field.id}`, null],
      [`bool_${field.id}`, null],
    ])
  );

  return (
    <main className="app-shell">
      <Sidebar activeCollectionId={collectionId} />

      <section className="main-panel">
        <header className="topbar">
          <div>
            <div className="top-link-row">
              <Link href="/" className="back-link">
                ← Back
              </Link>
            </div>

            <h1 className="page-title">{collection.name}</h1>
            <p className="page-subtitle">{collection.description || " "}</p>
          </div>

          <div className="topbar-actions">
            <Link
              href={`/collections/${collectionId}/records/new`}
              className="primary-button-link"
            >
              New Record
            </Link>

            <Link
              href={`/collections/${collectionId}/import`}
              className="secondary-button-link"
            >
              Import CSV
            </Link>

            <Link
              href={`/collections/${collectionId}/export`}
              className="secondary-button-link"
            >
              Export CSV
            </Link>

            <Link
              href={`/collections/${collectionId}/settings`}
              className="secondary-button-link"
            >
              Edit Fields
            </Link>

            <form action={deleteCollection}>
              <input type="hidden" name="id" value={collection.id} />
              <button type="submit" className="danger-button">
                Delete Collection
              </button>
            </form>
          </div>
        </header>

        <section className="page-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Fields</div>
              <div className="stat-value">{fieldRows.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Records</div>
              <div className="stat-value">{recordRows.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Showing</div>
              <div className="stat-value">{sortedRecordRows.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Slug</div>
              <div className="stat-value">{collection.slug}</div>
            </div>
          </div>

          {fieldRows.length > 0 ? (
            <div className="panel-card">
              <div className="section-row">
                <h2 className="section-title">Filters</h2>

                {hasActiveFilters ? (
                  <Link
                    href={buildHref(clearFilterUpdates)}
                    className="secondary-button-link"
                  >
                    Clear Filters
                  </Link>
                ) : null}
              </div>

              <form method="get" className="filter-form">
                {activeField ? (
                  <>
                    <input type="hidden" name="sort" value={activeField.id} />
                    <input type="hidden" name="dir" value={activeDir} />
                  </>
                ) : null}

                <div className="filter-grid">
                  {fieldRows.map((field) => (
                    <div key={field.id} className="filter-block">
                      <div className="field-label">{field.name}</div>

                      {field.type === "text" ? (
                        <input
                          name={`f_${field.id}`}
                          type="text"
                          className="text-input"
                          defaultValue={currentParams.get(`f_${field.id}`) ?? ""}
                          placeholder="Contains..."
                        />
                      ) : null}

                      {field.type === "number" ? (
                        <div className="split-inputs">
                          <input
                            name={`min_${field.id}`}
                            type="number"
                            step="any"
                            className="text-input"
                            defaultValue={currentParams.get(`min_${field.id}`) ?? ""}
                            placeholder="Min"
                          />
                          <input
                            name={`max_${field.id}`}
                            type="number"
                            step="any"
                            className="text-input"
                            defaultValue={currentParams.get(`max_${field.id}`) ?? ""}
                            placeholder="Max"
                          />
                        </div>
                      ) : null}

                      {field.type === "date" ? (
                        <div className="split-inputs">
                          <input
                            name={`from_${field.id}`}
                            type="date"
                            className="text-input"
                            defaultValue={currentParams.get(`from_${field.id}`) ?? ""}
                          />
                          <input
                            name={`to_${field.id}`}
                            type="date"
                            className="text-input"
                            defaultValue={currentParams.get(`to_${field.id}`) ?? ""}
                          />
                        </div>
                      ) : null}

                      {field.type === "boolean" ? (
                        <select
                          name={`bool_${field.id}`}
                          className="text-input"
                          defaultValue={currentParams.get(`bool_${field.id}`) ?? ""}
                        >
                          <option value="">Any</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="filter-actions">
                  <button type="submit" className="primary-button">
                    Apply Filters
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="panel-card">
            <div className="section-row">
              <h2 className="section-title">Fields</h2>

              <Link
                href={`/collections/${collectionId}/settings`}
                className="secondary-button-link"
              >
                Edit
              </Link>
            </div>

            {fieldRows.length === 0 ? (
              <div className="empty-state-title">No fields</div>
            ) : (
              <div className="field-list compact-field-list">
                {fieldRows.map((field) => (
                  <div key={field.id} className="field-card">
                    <div className="field-card-main">
                      <div className="field-card-title-row">
                        <div className="field-card-title">{field.name}</div>
                        <div className="field-chip">{field.type}</div>
                        {field.required ? (
                          <div className="field-chip required-chip">
                            required
                          </div>
                        ) : null}
                      </div>

                      <div className="field-meta">{field.key}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-card">
            <div className="section-row">
              <h2 className="section-title">Records</h2>

              <div className="section-row-actions">
                {activeField ? (
                  <Link
                    href={buildHref({
                      sort: null,
                      dir: null,
                    })}
                    className="secondary-button-link"
                  >
                    Clear Sort
                  </Link>
                ) : null}

                <Link
                  href={`/collections/${collectionId}/import`}
                  className="secondary-button-link"
                >
                  Import CSV
                </Link>

                <Link
                  href={`/collections/${collectionId}/export`}
                  className="secondary-button-link"
                >
                  Export CSV
                </Link>

                <Link
                  href={`/collections/${collectionId}/records/new`}
                  className="primary-button-link"
                >
                  New Record
                </Link>
              </div>
            </div>

            {fieldRows.length === 0 ? (
              <div className="empty-state-title">No fields</div>
            ) : sortedRecordRows.length === 0 ? (
              <div className="empty-state-title">
                {hasActiveFilters ? "No matching records" : "No records"}
              </div>
            ) : (
              <div className="table-wrap table-wrap-tight">
                <table className="record-table">
                  <thead>
                    <tr>
                      {fieldRows.map((field) => (
                        <th key={field.id}>
                          <Link
                            href={buildHref({
                              sort: field.id,
                              dir: nextDir(
                                activeField?.id ?? null,
                                activeDir,
                                field.id
                              ),
                            })}
                            className={
                              activeField?.id === field.id
                                ? "sort-link active"
                                : "sort-link"
                            }
                          >
                            <span>{field.name}</span>
                            <span className="sort-indicator">
                              {activeField?.id === field.id
                                ? activeDir === "asc"
                                  ? "↑"
                                  : "↓"
                                : "↕"}
                            </span>
                          </Link>
                        </th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRecordRows.map((record) => (
                      <tr key={record.id}>
                        {fieldRows.map((field) => {
                          const value = valueMap.get(`${record.id}:${field.id}`);

                          return (
                            <td key={field.id}>
                              {formatCellValue(field.type, value)}
                            </td>
                          );
                        })}

                        <td className="table-actions-cell">
                          <div className="table-action-group">
                            <Link
                              href={`/collections/${collectionId}/records/${record.id}/edit`}
                              className="table-edit-link"
                            >
                              Edit
                            </Link>

                            <form action={deleteRecord}>
                              <input
                                type="hidden"
                                name="collectionId"
                                value={collectionId}
                              />
                              <input
                                type="hidden"
                                name="recordId"
                                value={record.id}
                              />
                              <button
                                type="submit"
                                className="table-delete-button"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}