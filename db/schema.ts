import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const deployObservations = sqliteTable(
  "deploy_observations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    environment: text("environment").notNull(),
    version: text("version").notNull(),
    train: integer("train").notNull(),
    patch: integer("patch").notNull(),
    tag: text("tag").notNull(),
    commitSha: text("commit_sha").notNull(),
    sourceUpdatedAt: text("source_updated_at").notNull(),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [index("deploy_observations_environment_id_idx").on(table.environment, table.id)],
);
