import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import path from "path"

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db"
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)

const sqlite = new Database(absolutePath)
sqlite.pragma("journal_mode = WAL")

export const db = drizzle(sqlite, { schema })

// Export schema for easy access
export * from "./schema"
