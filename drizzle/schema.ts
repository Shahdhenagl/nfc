import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 160 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "customer"]).default("customer").notNull(),
  status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 48 }).notNull().unique(),
  type: mysqlEnum("type", ["music", "quran"]).notNull(),
  description: text("description"),
  logo: varchar("logo", { length: 500 }),
  coverImage: varchar("coverImage", { length: 500 }),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ slugIdx: uniqueIndex("products_slug_idx").on(table.slug) }));

export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  customerId: int("customerId").references(() => users.id),
  licenseKey: varchar("licenseKey", { length: 80 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 220 }).notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended", "expired", "revoked"]).default("pending").notNull(),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ productIdx: index("licenses_product_idx").on(table.productId), customerIdx: index("licenses_customer_idx").on(table.customerId) }));

export const nfcCards = mysqlTable("nfc_cards", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  nfcCode: varchar("nfcCode", { length: 80 }).notNull().unique(),
  accessToken: varchar("accessToken", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["available", "assigned", "active", "suspended", "disabled"]).default("available").notNull(),
  activatedAt: timestamp("activatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ accessIdx: uniqueIndex("nfc_access_token_idx").on(table.accessToken), productIdx: index("nfc_product_idx").on(table.productId) }));

export const deviceRegistrations = mysqlTable("device_registrations", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  deviceTokenHash: varchar("deviceTokenHash", { length: 128 }).notNull().unique(),
  fingerprint: varchar("fingerprint", { length: 128 }),
  browser: varchar("browser", { length: 120 }),
  operatingSystem: varchar("operatingSystem", { length: 120 }),
  userAgent: text("userAgent"),
  firstIp: varchar("firstIp", { length: 128 }),
  lastIp: varchar("lastIp", { length: 128 }),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  revokedAt: timestamp("revokedAt"),
}, table => ({ licenseIdx: index("devices_license_idx").on(table.licenseId) }));

export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").references(() => licenses.id),
  accessToken: varchar("accessToken", { length: 128 }),
  ipAddress: varchar("ipAddress", { length: 128 }),
  userAgent: text("userAgent"),
  deviceId: int("deviceId").references(() => deviceRegistrations.id),
  success: boolean("success").default(false).notNull(),
  failureReason: varchar("failureReason", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ rateIdx: index("login_attempts_rate_idx").on(table.accessToken, table.ipAddress, table.createdAt) }));

export const deviceResetRequests = mysqlTable("device_reset_requests", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  cardId: int("cardId").notNull().references(() => nfcCards.id),
  deviceId: int("deviceId").references(() => deviceRegistrations.id),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  requestedBy: varchar("requestedBy", { length: 160 }),
  reviewedBy: int("reviewedBy").references(() => users.id),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ statusIdx: index("reset_status_idx").on(table.status), licenseIdx: index("reset_license_idx").on(table.licenseId) }));

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  contentType: varchar("contentType", { length: 32 }).notNull(),
  titleEn: varchar("titleEn", { length: 240 }).notNull(),
  titleAr: varchar("titleAr", { length: 240 }),
  subtitle: varchar("subtitle", { length: 240 }),
  description: text("description"),
  artistOrReciter: varchar("artistOrReciter", { length: 180 }),
  albumOrCategory: varchar("albumOrCategory", { length: 180 }),
  durationSeconds: int("durationSeconds"),
  mediaUrl: varchar("mediaUrl", { length: 1000 }),
  coverImage: varchar("coverImage", { length: 1000 }),
  metadata: json("metadata"),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ productTypeIdx: index("content_product_type_idx").on(table.productId, table.contentType) }));

export const playlists = mysqlTable("playlists", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  productId: int("productId").notNull().references(() => products.id),
  nameEn: varchar("nameEn", { length: 180 }).notNull(),
  nameAr: varchar("nameAr", { length: 180 }),
  description: text("description"),
  coverImage: varchar("coverImage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const playlistItems = mysqlTable("playlist_items", {
  id: int("id").autoincrement().primaryKey(),
  playlistId: int("playlistId").notNull().references(() => playlists.id),
  contentId: int("contentId").notNull().references(() => contentItems.id),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  contentId: int("contentId").notNull().references(() => contentItems.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ uniqueFavorite: uniqueIndex("favorite_license_content_idx").on(table.licenseId, table.contentId) }));

export const recentlyPlayed = mysqlTable("recently_played", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull().references(() => licenses.id),
  contentId: int("contentId").notNull().references(() => contentItems.id),
  positionSeconds: int("positionSeconds").default(0).notNull(),
  playedAt: timestamp("playedAt").defaultNow().notNull(),
}, table => ({ recentIdx: index("recent_license_idx").on(table.licenseId, table.playedAt), recentContentIdx: uniqueIndex("recent_license_content_idx").on(table.licenseId, table.contentId) }));

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  metadata: json("metadata"),
  ipAddress: varchar("ipAddress", { length: 128 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ auditIdx: index("audit_created_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type NfcCard = typeof nfcCards.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
