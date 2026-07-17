import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Sidebar from "../../../components/Sidebar";
import { importCsv } from "../../../actions/import";
import { db } from "../../../../db";
import { collections } from "../../../../db/schema";

type ImportPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    row?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getImportError(error?: string, row?: string) {
  if (error === "empty-file") {
    return "That CSV is empty.";
  }

  if (error === "file-too-large") {
    return "That CSV is over the 5 MB import limit.";
  }

  if (error === "too-many-rows") {
    return "That CSV has more than 10,000 rows. Split it into smaller files first.";
  }

  if (error === "invalid-csv") {
    return "That CSV has an unclosed quoted value.";
  }

  if (error === "no-records") {
    return "That CSV has headers, but no records to import.";
  }

  if (error === "invalid-values") {
    return `Row ${row ?? "?"} has a missing or invalid typed value. Nothing was imported.`;
  }

  return null;
}

export default async function ImportPage({
  params,
  searchParams,
}: ImportPageProps) {
  const { collectionId } = await params;
  const rawSearchParams = await searchParams;

  await connection();

  const importError = getImportError(
    getSingleParam(rawSearchParams.error),
    getSingleParam(rawSearchParams.row)
  );

  const collection = db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .all()[0];

  if (!collection) {
    notFound();
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

            <h1 className="page-title">Import CSV</h1>
            <p className="page-subtitle">{collection.name}</p>
          </div>
        </header>

        <section className="page-content">
          <div className="panel-card">
            {importError ? (
              <p className="form-error" role="alert">
                {importError}
              </p>
            ) : null}

            <form
              action={importCsv}
              className="form-grid"
            >
              <input type="hidden" name="collectionId" value={collectionId} />

              <div className="field-block">
                <label htmlFor="file" className="field-label">
                  CSV File
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  className="file-input"
                  required
                />
              </div>

              <div className="helper-text">
                Matching headers reuse existing fields. New headers create text
                fields.
              </div>

              <div className="button-row">
                <button type="submit" className="primary-button">
                  Import CSV
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
        </section>
      </section>
    </main>
  );
}
