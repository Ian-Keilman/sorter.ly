import "dotenv/config";
import { db } from "../db";
import { collections } from "../db/schema";

const rows = db.select().from(collections).all();

console.log("Database connection works.");
console.log("collections rows:", rows.length);