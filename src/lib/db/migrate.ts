import Database from "better-sqlite3"
import path from "path"

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db"
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath)

const sqlite = new Database(absolutePath)
sqlite.pragma("journal_mode = WAL")

// Create tables
sqlite.exec(`
  -- Users (NextAuth)
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    emailVerified INTEGER,
    image TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Accounts (NextAuth)
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    providerAccountId TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );

  -- Sessions (NextAuth)
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    sessionToken TEXT NOT NULL UNIQUE,
    userId TEXT NOT NULL,
    expires INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );

  -- Verification Tokens (NextAuth)
  CREATE TABLE IF NOT EXISTS verificationToken (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires INTEGER NOT NULL
  );

  -- User Settings
  CREATE TABLE IF NOT EXISTS userSettings (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    defaultCurrency TEXT NOT NULL DEFAULT 'CZK',
    scanFrequency INTEGER NOT NULL DEFAULT 60,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );

  -- Spaces
  CREATE TABLE IF NOT EXISTS space (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    userId TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE(userId, name)
  );

  -- Cloud Storage
  CREATE TABLE IF NOT EXISTS cloudStorage (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
    accessToken TEXT,
    refreshToken TEXT,
    tokenExpiry INTEGER,
    userId TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );

  -- Invoice Folders
  CREATE TABLE IF NOT EXISTS invoiceFolder (
    id TEXT PRIMARY KEY,
    cloudStorageId TEXT NOT NULL,
    folderId TEXT NOT NULL,
    folderPath TEXT NOT NULL,
    lastScannedAt INTEGER,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (cloudStorageId) REFERENCES cloudStorage(id) ON DELETE CASCADE,
    UNIQUE(cloudStorageId, folderId)
  );

  -- Invoices
  CREATE TABLE IF NOT EXISTS invoice (
    id TEXT PRIMARY KEY,
    cloudStorageId TEXT,
    cloudFilePath TEXT,
    cloudFileId TEXT,
    cloudFileUrl TEXT,
    fileName TEXT NOT NULL,
    supplierName TEXT,
    invoiceNumber TEXT,
    issueDate INTEGER,
    taxableSupplyDate INTEGER,
    totalPrice REAL,
    currency TEXT,
    hasVat INTEGER,
    extractionConfidence REAL,
    rawExtractedData TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    processedAt INTEGER,
    spaceId TEXT,
    scannedFromFolderId TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (cloudStorageId) REFERENCES cloudStorage(id) ON DELETE SET NULL,
    FOREIGN KEY (spaceId) REFERENCES space(id) ON DELETE SET NULL,
    FOREIGN KEY (scannedFromFolderId) REFERENCES invoiceFolder(id) ON DELETE SET NULL
  );

  -- Assets
  CREATE TABLE IF NOT EXISTS asset (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'OTHER',
    purchaseDate INTEGER NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CZK',
    depreciationType TEXT NOT NULL DEFAULT 'NONE',
    depreciationYears INTEGER,
    depreciationEndDate INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    spaceId TEXT NOT NULL,
    invoiceId TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (spaceId) REFERENCES space(id) ON DELETE CASCADE,
    FOREIGN KEY (invoiceId) REFERENCES invoice(id) ON DELETE SET NULL
  );

  -- Software
  CREATE TABLE IF NOT EXISTS software (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'OTHER',
    url TEXT,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CZK',
    billingPeriod TEXT NOT NULL DEFAULT 'MONTHLY',
    startDate INTEGER NOT NULL,
    nextPaymentDate INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    spaceId TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (spaceId) REFERENCES space(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_asset_spaceId ON asset(spaceId);
  CREATE INDEX IF NOT EXISTS idx_asset_status ON asset(status);
  CREATE INDEX IF NOT EXISTS idx_software_spaceId ON software(spaceId);
  CREATE INDEX IF NOT EXISTS idx_software_status ON software(status);
  CREATE INDEX IF NOT EXISTS idx_software_nextPaymentDate ON software(nextPaymentDate);
  CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status);
  CREATE INDEX IF NOT EXISTS idx_invoice_cloudStorageId ON invoice(cloudStorageId);
`)

console.log("Database migration completed successfully!")
sqlite.close()
