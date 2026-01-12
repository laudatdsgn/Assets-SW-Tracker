import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import path from "path"
import fs from "fs"

// Get database path from environment or use default
const dbUrl = process.env.DATABASE_URL || "file:./dev.db"
const dbPath = dbUrl.replace("file:", "").replace(/^\.\//, "")

// Resolve to absolute path in project root
const absolutePath = path.join(process.cwd(), dbPath)

// Ensure the directory exists
const dbDir = path.dirname(absolutePath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Create database connection
const sqlite = new Database(absolutePath)
sqlite.pragma("journal_mode = WAL")

export const db = drizzle(sqlite, { schema })

// Export schema for easy access
export * from "./schema"
