import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Sidebar from "../../../components/Sidebar";
import ConfirmSubmitButton from "../../../components/ConfirmSubmitButton";
import FieldConfigurationInputs from "../../../components/FieldConfigurationInputs";

/* v0.1.1 change here */
import { updateCollection } from "../../../actions/collections";
import {
  createField,
  deleteField,
  updateFieldSettings,
} from "../../../actions/fields";


import { db } from "../../../../db";
import { collections, fields } from "../../../../db/schema";
import { parseFieldConfiguration } from "../../../../core/field-config";

type CollectionSettingsPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function CollectionSettingsPage({
  params,
  searchParams,
}: CollectionSettingsPageProps) {
  const { collectionId } = await params;
  const rawSearchParams = await searchParams;

  await connection();

  const error = Array.isArray(rawSearchParams.error)
    ? rawSearchParams.error[0]
    : rawSearchParams.error;

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
          {error === "invalid-field-settings" ? (
            <p className="form-error" role="alert">
              Check the default value and rating settings, then try again.
            </p>
          ) : null}

          {error === "incompatible-rating-settings" ? (
            <p className="form-error" role="alert">
              Existing ratings do not fit those settings. Adjust the values first.
            </p>
          ) : null}

          <div className="panel-card">
            <h2 className="section-title">Collection</h2>

            <form action={updateCollection} className="form-grid">
              <input type="hidden" name="id" value={collectionId} />

              <div className="field-block">
                <label htmlFor="collection-name" className="field-label">
                  Name
                </label>
                <input
                  id="collection-name"
                  name="name"
                  type="text"
                  className="text-input"
                  defaultValue={collection.name}
                  required
                />
              </div>

              <div className="field-block">
                <label htmlFor="collection-description" className="field-label">
                  Description
                </label>
                <textarea
                  id="collection-description"
                  name="description"
                  className="textarea-input"
                  rows={4}
                  defaultValue={collection.description ?? ""}
                />
              </div>

              <div className="button-row">
                <button type="submit" className="primary-button">
                  Save Collection
                </button>
              </div>
            </form>
          </div>
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

              <FieldConfigurationInputs
                idPrefix="new-field"
                initialType="text"
                showType
              />

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
                {fieldRows.map((field) => {
                  const configuration = parseFieldConfiguration(
                    field.type,
                    field.configuration
                  );
                  const defaultLabel =
                    configuration.defaultValue === "true"
                      ? "Yes"
                      : configuration.defaultValue === "false"
                        ? "No"
                        : configuration.defaultValue;

                  return (
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
                          {configuration.rating
                            ? ` · out of ${configuration.rating.maximum} · step ${configuration.rating.step}`
                            : ""}
                          {defaultLabel !== undefined
                            ? ` · default: ${defaultLabel}`
                            : ""}
                        </div>
                      </div>

                      <div className="field-card-actions">
                        <details className="field-settings-details">
                          <summary>Settings</summary>
                          <form
                            action={updateFieldSettings}
                            className="field-settings-form"
                          >
                            <input
                              type="hidden"
                              name="fieldId"
                              value={field.id}
                            />
                            <input
                              type="hidden"
                              name="collectionId"
                              value={collectionId}
                            />
                            <FieldConfigurationInputs
                              idPrefix={`field-${field.id}`}
                              initialType={field.type}
                              defaultValue={configuration.defaultValue}
                              ratingMaximum={configuration.rating?.maximum}
                              ratingStep={configuration.rating?.step}
                            />
                            <button type="submit" className="primary-button">
                              Save Settings
                            </button>
                          </form>
                        </details>

                        <form action={deleteField}>
                          <input type="hidden" name="fieldId" value={field.id} />
                          <input
                            type="hidden"
                            name="collectionId"
                            value={collectionId}
                          />
                          <ConfirmSubmitButton
                            label="Delete"
                            confirmMessage={`Delete "${field.name}" and its values from every record? This cannot be undone.`}
                            className="danger-button"
                          />
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
