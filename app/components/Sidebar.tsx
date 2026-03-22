import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "../../db";
import { collections } from "../../db/schema";
import { deleteCollection } from "../actions/collections";

type SidebarProps = {
  activeCollectionId?: string;
};

export default async function Sidebar({
  activeCollectionId,
}: SidebarProps) {
  const allCollections = db
    .select()
    .from(collections)
    .orderBy(asc(collections.name))
    .all();

  return (
    <aside className="sidebar">
      <div className="brand">sorter.ly</div>

      <Link href="/" className="new-button-link">
        + New Collection
      </Link>

      <div className="sidebar-label">Collections</div>

      <nav className="collection-list">
        {allCollections.length === 0 ? (
          <div className="empty-sidebar-text">No collections yet</div>
        ) : (
          allCollections.map((collection) => (
            <div key={collection.id} className="collection-row">
              <Link
                href={`/collections/${collection.id}`}
                className={
                  activeCollectionId === collection.id
                    ? "collection-link active"
                    : "collection-link"
                }
              >
                {collection.name}
              </Link>

              <form action={deleteCollection}>
                <input type="hidden" name="id" value={collection.id} />
                <button
                  type="submit"
                  className="collection-delete"
                  aria-label={`Delete ${collection.name}`}
                  title={`Delete ${collection.name}`}
                >
                  ×
                </button>
              </form>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}