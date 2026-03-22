import Sidebar from "./components/Sidebar";
import { createCollection } from "./actions/collections";

export default function Home() {
  return (
    <main className="app-shell">
      <Sidebar />

      <section className="main-panel">
        <header className="topbar">
          <div>
            <h1 className="page-title">Create a collection</h1>
            <p className="page-subtitle">
              {/* I don't really know what to put here as a subtitle. */}
            </p>
          </div>
        </header>

        <section className="page-content">
          <div className="panel-card">
            <h2 className="section-title">New Collection</h2>

            <form action={createCollection} className="form-grid">
              <div className="field-block">
                <label htmlFor="name" className="field-label">
                  Collection Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="text-input"
                  placeholder="EX: Candies"
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
                  placeholder="EX: List of candies that I've tried, plan to try, how good they taste, and how much they cost"
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

        </section>
      </section>
    </main>
  );
}