import Link from "next/link";
import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "../../db";
import { collections } from "../../db/schema";
import { deleteCollection } from "../actions/collections";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

type SidebarProps = {
  activeCollectionId?: string;
};

export default async function Sidebar({
  activeCollectionId,
}: SidebarProps) {
  await connection();

  const allCollections = db
    .select()
    .from(collections)
    .orderBy(asc(collections.name))
    .all();

  return (
    <aside className="sidebar">
      <Link href="/" className = "brand">
        sorter.ly
      </Link>

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
                <ConfirmSubmitButton
                  label="×"
                  confirmMessage={`Delete "${collection.name}" and all its records? This cannot be undone.`}
                  className="collection-delete"
                  ariaLabel={`Delete ${collection.name}`}
                  title={`Delete ${collection.name}`}
                />
              </form>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
