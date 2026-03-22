import Link from "next/link";
import { asc, eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Sidebar from "../../../../../components/Sidebar";
import { updateRecord } from "../../../../../actions/records";
import { db } from "../../../../../../db";
import {
  collections,
  fields,
  records,
  recordValues,
} from "../../../../../../db/schema";

type EditRecordPageProps = {
  params: Promise<{
    collectionId: string;
    recordId: string;
  }>;
};

export default async function EditRecordPage({
  params,
}: EditRecordPageProps) {
  const { collectionId, recordId } = await params;

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  if (!collection) {
    notFound();
  }

  const record = db
    .select()
    .from(records)
    .where(
      and(eq(records.id, recordId), eq(records.collectionId, collectionId))
    )
    .all()[0];

  if (!record) {
    notFound();
  }

  const fieldRows = db
    .select()
    .from(fields)
    .where(eq(fields.collectionId, collectionId))
    .orderBy(asc(fields.position))
    .all();

  const valueRows = db
    .select()
    .from(recordValues)
    .where(eq(recordValues.recordId, recordId))
    .all();

  const valueMap = new Map<
    string,
    {
      textValue: string | null;
      numberValue: number | null;
      dateValue: string | null;
      booleanValue: boolean | null;
    }
  >();

  for (const valueRow of valueRows) {
    valueMap.set(valueRow.fieldId, {
      textValue: valueRow.textValue,
      numberValue: valueRow.numberValue,
      dateValue: valueRow.dateValue,
      booleanValue: valueRow.booleanValue,
    });
  }

  return (
    <main className="app-shell">
      <Sidebar activeCollectionId={collectionId} />

      <section className="main-panel">
        <header className="topbar">
          <div>
            <div className="top-link-row">
              <Link href={`/collections/${collectionId}`} className="back-link">
                ← Back to Collection
              </Link>
            </div>

            <h1 className="page-title">Edit Record</h1>
            <p className="page-subtitle">{collection.name}</p>
          </div>
        </header>

        <section className="page-content">
          {fieldRows.length === 0 ? (
            <div className="panel-card">
              <div className="empty-state-title">No fields</div>
              <div className="button-row">
                <Link
                  href={`/collections/${collectionId}/settings`}
                  className="secondary-button-link"
                >
                  Edit Fields
                </Link>
              </div>
            </div>
          ) : (
            <div className="panel-card">
              <form action={updateRecord} className="form-grid">
                <input type="hidden" name="collectionId" value={collectionId} />
                <input type="hidden" name="recordId" value={recordId} />

                {fieldRows.map((field) => {
                  const value = valueMap.get(field.id);

                  return (
                    <div key={field.id} className="field-block">
                      {field.type === "boolean" ? (
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            name={`field_${field.id}`}
                            defaultChecked={value?.booleanValue === true}
                          />
                          <span>{field.name}</span>
                        </label>
                      ) : (
                        <>
                          <label htmlFor={field.id} className="field-label">
                            {field.name}
                          </label>

                          {field.type === "text" ? (
                            <input
                              id={field.id}
                              name={`field_${field.id}`}
                              type="text"
                              className="text-input"
                              defaultValue={value?.textValue ?? ""}
                              required={field.required}
                            />
                          ) : null}

                          {field.type === "number" ? (
                            <input
                              id={field.id}
                              name={`field_${field.id}`}
                              type="number"
                              step="any"
                              className="text-input"
                              defaultValue={value?.numberValue ?? ""}
                              required={field.required}
                            />
                          ) : null}

                          {field.type === "date" ? (
                            <input
                              id={field.id}
                              name={`field_${field.id}`}
                              type="date"
                              className="text-input"
                              defaultValue={value?.dateValue ?? ""}
                              required={field.required}
                            />
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="button-row">
                  <button type="submit" className="primary-button">
                    Save Changes
                  </button>

                  <Link
                    href={`/collections/${collectionId}`}
                    className="secondary-button-link"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}