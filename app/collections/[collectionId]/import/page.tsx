import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import { importCsv } from "../../../actions/import";
import { db } from "../../../../db";
import { collections } from "../../../../db/schema";

type ImportPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export default async function ImportPage({ params }: ImportPageProps) {
  const { collectionId } = await params;

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
            <form
              action={importCsv}
              encType="multipart/form-data"
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