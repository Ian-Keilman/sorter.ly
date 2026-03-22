"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { collections } from "../../db/schema";

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "collection";
}

export async function createCollection(formData: FormData) {
  const rawName = formData.get("name");
  const rawDescription = formData.get("description");

  const name = typeof rawName === "string" ? rawName.trim() : "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";

  if (!name) {
    return;
  }

  const id = crypto.randomUUID();
  const baseSlug = slugify(name);

  const existing = db
    .select()
    .from(collections)
    .where(eq(collections.slug, baseSlug))
    .all();

  const slug =
    existing.length === 0 ? baseSlug : `${baseSlug}-${id.slice(0, 6)}`;

  db.insert(collections)
    .values({
      id,
      name,
      slug,
      description: description || null,
    })
    .run();

  revalidatePath("/");
  redirect(`/collections/${id}`);
}

export async function deleteCollection(formData: FormData) {
  const rawId = formData.get("id");
  const id = typeof rawId === "string" ? rawId : "";

  if (!id) {
    return;
  }

  db.delete(collections).where(eq(collections.id, id)).run();

  revalidatePath("/");
  redirect("/");
}