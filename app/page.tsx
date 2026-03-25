import Link from "next/link";
import { asc } from "drizzle-orm";
import Sidebar from "./components/Sidebar";
import { createCollection } from "./actions/collections";
import { db } from "../db";
import { collections, fields, records } from "../db/schema";

export default function Home() {
  const allCollections = db
    .select()
    .from(collections)
    .orderBy(asc(collections.name))
    .all();

  const allFields = db.select().from(fields).all();
  const allRecords = db.select().from(records).all();


  return (
    <main className="app-shell">
      <Sidebar />

       <section className="main-panel">
        <header className="topbar">
          <div>
            <h1 className="page-title">Home</h1>
            <p className="page-subtitle">Local-first customizable collections</p>
          </div>
        </header>

        <section className="page-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Collections</div>
              <div className="stat-value">{allCollections.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Fields</div>
              <div className="stat-value">{allFields.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Records</div>
              <div className="stat-value">{allRecords.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Storage</div>
              <div className="stat-value">Local</div>
            </div>
          </div>

          <div className="panel-card">
            <h2 className="section-title">Create Collection</h2>

            <form action={createCollection} className="form-grid">
              <div className="field-block">
                <label htmlFor="name" className="field-label">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="text-input"
                  placeholder="Movies"
                  required
                />
              </div>

              <div className="field-block">
                <label htmlFor="description" className="field-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="textarea-input"
                  placeholder="Personal movie tracker"
                  rows={4}
                />
              </div>

              <div className="button-row">
                <button type="submit" className="primary-button">
                  Create Collection
                </button>
              </div>
            </form>
          </div>

          <div className="panel-card">
            <div className="section-row">
              <h2 className="section-title">Collections</h2>
            </div>

            {allCollections.length === 0 ? (
              <div className="empty-state-title">No collections</div>
            ) : (
              <div className="home-collection-list">
                {allCollections.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.id}`}
                    className="home-collection-card"
                  >
                    <div className="home-collection-title">{collection.name}</div>
                    <div className="home-collection-meta">
                      {collection.description || "No description"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}