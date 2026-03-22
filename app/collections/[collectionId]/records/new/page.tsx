import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import { createRecord } from "../../../../actions/records";
import { db } from "../../../../../db";
import { collections, fields } from "../../../../../db/schema";

type NewRecordPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export default async function NewRecordPage({ params }: NewRecordPageProps) {
  const { collectionId } = await params;

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

            <h1 className="page-title">New Record</h1>
            <p className="page-subtitle">{collection.name}</p>
          </div>
        </header>

        <section className="page-content">
          {fieldRows.length === 0 ? (
            <div className="panel-card">
              <div className="empty-state-title">No fields</div>
              <p className="helper-text">Add fields before creating records.</p>
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
              <form action={createRecord} className="form-grid">
                <input type="hidden" name="collectionId" value={collectionId} />

                {fieldRows.map((field) => (
                  <div key={field.id} className="field-block">
                    {field.type === "boolean" ? (
                      <label className="checkbox-row">
                        <input type="checkbox" name={`field_${field.id}`} />
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
                            required={field.required}
                          />
                        ) : null}

                        {field.type === "date" ? (
                          <input
                            id={field.id}
                            name={`field_${field.id}`}
                            type="date"
                            className="text-input"
                            required={field.required}
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                ))}

                <div className="button-row">
                  <button type="submit" className="primary-button">
                    Save Record
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