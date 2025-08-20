import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  serial,
  unique,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(), // "user" or "admin"
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description").notNull(),
  author: text("author").notNull(),
  category: text("category").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
  icon: text("icon"),
  images: jsonb("images").$type<string[]>(),
  isOpenSource: boolean("is_open_source").default(false).notNull(),
  license: text("license").notNull(),
  compatibility: jsonb("compatibility").$type<{
    androidVersions: string[];
    rootMethods: ("Magisk" | "KernelSU" | "KernelSU-Next")[];
  }>().notNull(),
  warnings: jsonb("warnings").$type<{
    type: "malware" | "closed-source" | "stolen-code";
    message: string;
  }[]>().default([]).notNull(),
  reviewNotes: jsonb("review_notes").$type<{
    type: "approved" | "rejected" | "changes-requested";
    message: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }[]>().default([]).notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  sourceUrl: text("source_url"),
  communityUrl: text("community_url"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  githubRepo: text("github_repo"),
  isRecommended: boolean("is_recommended").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  status: text("status").default("pending").notNull(), // "pending" | "approved" | "declined"
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  submittedBy: text("submitted_by").references(() => user.id, { onDelete: "set null" }),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  helpful: integer("helpful").default(0).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => ({
  userModuleUnique: unique().on(table.userId, table.moduleId),
}));

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  downloadUrl: text("download_url").notNull(), // Primary download URL (first or main file)
  size: text("size").notNull(), // Total size of all files
  changelog: text("changelog"),
  downloads: integer("downloads").default(0).notNull(),
  isLatest: boolean("is_latest").default(false).notNull(),
  githubReleaseId: text("github_release_id"),
  githubTagName: text("github_tag_name"),
  assets: jsonb("assets").$type<{
    name: string;
    downloadUrl: string;
    size: string;
    contentType?: string;
  }[]>(), // Array of all release files/assets
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const replies = pgTable("replies", {
  id: serial("id").primaryKey(),
  ratingId: integer("rating_id")
    .notNull()
    .references(() => ratings.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  helpful: integer("helpful").default(0).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const helpfulVotes = pgTable("helpful_votes", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ratingId: integer("rating_id")
    .references(() => ratings.id, { onDelete: "cascade" }),
  replyId: integer("reply_id")
    .references(() => replies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const adminActions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details").notNull(),
  targetType: text("target_type"), // "module", "user", "system", "review"
  targetId: text("target_id"),
  oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
  newValues: jsonb("new_values").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const githubTokens = pgTable("github_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  hashedToken: text("hashed_token").notNull(),
  salt: text("salt").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const releaseSchedule = pgTable("release_schedule", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  intervalHours: integer("interval_hours").default(1).notNull(),
  batchSize: integer("batch_size").default(10).notNull(),
  nextRunAt: timestamp("next_run_at").notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const moduleGithubSync = pgTable("module_github_sync", {
  id: serial("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  githubRepo: text("github_repo").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  lastReleaseId: text("last_release_id"),
  syncErrors: jsonb("sync_errors").$type<{
    error: string;
    timestamp: string;
    retryCount: number;
  }[]>().default([]).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const adminJobs = pgTable("admin_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(),
  progress: integer("progress").default(0).notNull(),
  startedBy: text("started_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  parameters: jsonb("parameters").$type<Record<string, unknown>>(),
  results: jsonb("results").$type<{
    success: boolean;
    processedCount?: number;
    errorCount?: number;
    errors?: string[];
    summary?: string;
  }>(),
  logs: jsonb("logs").$type<{
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
  }[]>().default([]).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  scopes: jsonb("scopes").$type<string[]>().default(["read"]).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: text("last_used_ip"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedBy: text("revoked_by")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
