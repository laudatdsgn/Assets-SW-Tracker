import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"

// ============================================
// Authentication (NextAuth)
// ============================================

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

// ============================================
// User Settings
// ============================================

export const userSettings = sqliteTable("userSettings", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  defaultCurrency: text("defaultCurrency").notNull().default("CZK"),
  scanFrequency: integer("scanFrequency").notNull().default(60),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Spaces (OSVČ, s.r.o., etc.)
// ============================================

export const spaces = sqliteTable("space", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Assets
// ============================================

export const assets = sqliteTable("asset", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("OTHER"),
  purchaseDate: integer("purchaseDate", { mode: "timestamp" }).notNull(),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("CZK"),
  depreciationType: text("depreciationType").notNull().default("NONE"),
  depreciationYears: integer("depreciationYears"),
  depreciationEndDate: integer("depreciationEndDate", { mode: "timestamp" }),
  status: text("status").notNull().default("ACTIVE"),
  spaceId: text("spaceId").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  invoiceId: text("invoiceId").references(() => invoices.id, { onDelete: "set null" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Software / Subscriptions
// ============================================

export const software = sqliteTable("software", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("OTHER"),
  url: text("url"),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("CZK"),
  billingPeriod: text("billingPeriod").notNull().default("MONTHLY"),
  startDate: integer("startDate", { mode: "timestamp" }).notNull(),
  nextPaymentDate: integer("nextPaymentDate", { mode: "timestamp" }),
  status: text("status").notNull().default("ACTIVE"),
  spaceId: text("spaceId").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Invoices
// ============================================

export const invoices = sqliteTable("invoice", {
  id: text("id").primaryKey(),
  cloudStorageId: text("cloudStorageId").references(() => cloudStorages.id, { onDelete: "set null" }),
  cloudFilePath: text("cloudFilePath"),
  cloudFileId: text("cloudFileId"),
  cloudFileUrl: text("cloudFileUrl"),
  fileName: text("fileName").notNull(),
  supplierName: text("supplierName"),
  invoiceNumber: text("invoiceNumber"),
  issueDate: integer("issueDate", { mode: "timestamp" }),
  taxableSupplyDate: integer("taxableSupplyDate", { mode: "timestamp" }),
  totalPrice: real("totalPrice"),
  currency: text("currency"),
  hasVat: integer("hasVat", { mode: "boolean" }),
  extractionConfidence: real("extractionConfidence"),
  rawExtractedData: text("rawExtractedData"),
  status: text("status").notNull().default("NEW"),
  processedAt: integer("processedAt", { mode: "timestamp" }),
  spaceId: text("spaceId").references(() => spaces.id, { onDelete: "set null" }),
  scannedFromFolderId: text("scannedFromFolderId").references(() => invoiceFolders.id, { onDelete: "set null" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Cloud Storage Integration
// ============================================

export const cloudStorages = sqliteTable("cloudStorage", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("GOOGLE_DRIVE"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: integer("tokenExpiry", { mode: "timestamp" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

export const invoiceFolders = sqliteTable("invoiceFolder", {
  id: text("id").primaryKey(),
  cloudStorageId: text("cloudStorageId").notNull().references(() => cloudStorages.id, { onDelete: "cascade" }),
  folderId: text("folderId").notNull(),
  folderPath: text("folderPath").notNull(),
  lastScannedAt: integer("lastScannedAt", { mode: "timestamp" }),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  spaces: many(spaces),
  settings: one(userSettings),
  cloudStorages: many(cloudStorages),
}))

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  user: one(users, { fields: [spaces.userId], references: [users.id] }),
  assets: many(assets),
  software: many(software),
  invoices: many(invoices),
}))

export const assetsRelations = relations(assets, ({ one }) => ({
  space: one(spaces, { fields: [assets.spaceId], references: [spaces.id] }),
  invoice: one(invoices, { fields: [assets.invoiceId], references: [invoices.id] }),
}))

export const softwareRelations = relations(software, ({ one }) => ({
  space: one(spaces, { fields: [software.spaceId], references: [spaces.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  space: one(spaces, { fields: [invoices.spaceId], references: [spaces.id] }),
  cloudStorage: one(cloudStorages, { fields: [invoices.cloudStorageId], references: [cloudStorages.id] }),
  scannedFromFolder: one(invoiceFolders, { fields: [invoices.scannedFromFolderId], references: [invoiceFolders.id] }),
  assets: many(assets),
}))

export const cloudStoragesRelations = relations(cloudStorages, ({ one, many }) => ({
  user: one(users, { fields: [cloudStorages.userId], references: [users.id] }),
  invoiceFolders: many(invoiceFolders),
  invoices: many(invoices),
}))

export const invoiceFoldersRelations = relations(invoiceFolders, ({ one, many }) => ({
  cloudStorage: one(cloudStorages, { fields: [invoiceFolders.cloudStorageId], references: [cloudStorages.id] }),
  invoices: many(invoices),
}))

// Type exports
export type User = typeof users.$inferSelect
export type Space = typeof spaces.$inferSelect
export type Asset = typeof assets.$inferSelect
export type Software = typeof software.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type CloudStorage = typeof cloudStorages.$inferSelect
export type InvoiceFolder = typeof invoiceFolders.$inferSelect
