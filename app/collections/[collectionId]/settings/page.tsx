import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import { createField, deleteField } from "../../../actions/fields";
import { db } from "../../../../db";
import { collections, fields } from "../../../../db/schema";

type CollectionSettingsPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export default async function CollectionSettingsPage({
  params,
}: CollectionSettingsPageProps) {
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

            <h1 className="page-title">{collection.name} Settings</h1>
            <p className="page-subtitle">
              Edit Fields
            </p>
          </div>
        </header>

        <section className="page-content">
          <div className="panel-card">
            <h2 className="section-title">Add Field</h2>

            <form action={createField} className="form-grid">
              <input type="hidden" name="collectionId" value={collectionId} />

              <div className="field-block">
                <label htmlFor="name" className="field-label">
                  Field Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="text-input"
                  placeholder="Title"
                  required
                />
              </div>

              <div className="field-block">
                <label htmlFor="type" className="field-label">
                  Field Type
                </label>
                <select id="type" name="type" className="text-input" defaultValue="text">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              <label className="checkbox-row">
                <input type="checkbox" name="required" />
                <span>Required field</span>
              </label>

              <div className="button-row">
                <button type="submit" className="primary-button">
                  Add Field
                </button>
              </div>
            </form>
          </div>

          <div className="panel-card">
            <h2 className="section-title">Current Fields</h2>

            {fieldRows.length === 0 ? (
              <p className="helper-text">No fields yet.</p>
            ) : (
              <div className="field-list">
                {fieldRows.map((field) => (
                  <div key={field.id} className="field-card">
                    <div className="field-card-main">
                      <div className="field-card-title-row">
                        <div className="field-card-title">{field.name}</div>
                        <div className="field-chip">{field.type}</div>
                        {field.required ? (
                          <div className="field-chip required-chip">required</div>
                        ) : null}
                      </div>

                      <div className="field-meta">
                        key: {field.key} · position: {field.position}
                      </div>
                    </div>

                    <form action={deleteField}>
                      <input type="hidden" name="fieldId" value={field.id} />
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collectionId}
                      />
                      <button type="submit" className="danger-button">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}