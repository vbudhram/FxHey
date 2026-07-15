import type { EnvironmentName, ServiceVersion } from "../app/lib/fxa-data";

export type DeploymentHistoryEntry = {
  id: number | null;
  environment: EnvironmentName;
  version: string;
  train: number;
  patch: number;
  tag: string;
  commit: string;
  sourceUpdatedAt: string;
  observedAt: string;
  evidence: "observed" | "current-snapshot";
};

type DeploymentHistoryRow = {
  id: number;
  environment: EnvironmentName;
  version: string;
  train: number;
  patch: number;
  tag: string;
  commit_sha: string;
  source_updated_at: string;
  observed_at: string;
};

const INSERT_IF_CHANGED = `
  INSERT INTO deploy_observations (
    environment,
    version,
    train,
    patch,
    tag,
    commit_sha,
    source_updated_at,
    observed_at
  )
  SELECT ?, ?, ?, ?, ?, ?, ?, ?
  WHERE COALESCE(
    (
      SELECT commit_sha
      FROM deploy_observations
      WHERE environment = ?
      ORDER BY id DESC
      LIMIT 1
    ),
    ''
  ) <> ?
`;

const SELECT_HISTORY = `
  SELECT
    id,
    environment,
    version,
    train,
    patch,
    tag,
    commit_sha,
    source_updated_at,
    observed_at
  FROM deploy_observations
  WHERE environment = ?
  ORDER BY id DESC
  LIMIT 12
`;

function currentSnapshot(service: ServiceVersion): DeploymentHistoryEntry {
  return {
    id: null,
    environment: service.name,
    version: service.version,
    train: service.train,
    patch: service.patch,
    tag: service.tag,
    commit: service.commit,
    sourceUpdatedAt: service.updatedAt,
    observedAt: service.updatedAt,
    evidence: "current-snapshot",
  };
}

function mapRow(row: DeploymentHistoryRow): DeploymentHistoryEntry {
  return {
    id: row.id,
    environment: row.environment,
    version: row.version,
    train: row.train,
    patch: row.patch,
    tag: row.tag,
    commit: row.commit_sha,
    sourceUpdatedAt: row.source_updated_at,
    observedAt: row.observed_at,
    evidence: "observed",
  };
}

async function getD1Binding() {
  try {
    const { env } = await import("cloudflare:workers");
    return env.DB ?? null;
  } catch {
    return null;
  }
}

export async function recordAndReadDeploymentHistory(
  services: ServiceVersion[],
  selectedEnvironment: EnvironmentName,
): Promise<DeploymentHistoryEntry[]> {
  const selectedService =
    services.find((service) => service.name === selectedEnvironment) ?? services[0];
  if (!selectedService) return [];

  try {
    const db = await getD1Binding();
    if (!db) throw new Error("D1 binding unavailable");

    const observedAt = new Date().toISOString();
    await db.batch(
      services.map((service) =>
        db.prepare(INSERT_IF_CHANGED).bind(
          service.name,
          service.version,
          service.train,
          service.patch,
          service.tag,
          service.commit,
          service.updatedAt,
          observedAt,
          service.name,
          service.commit,
        ),
      ),
    );

    const result = await db.prepare(SELECT_HISTORY).bind(selectedEnvironment).all<DeploymentHistoryRow>();
    const history = result.results.map(mapRow);
    return history.length ? history : [currentSnapshot(selectedService)];
  } catch {
    return [currentSnapshot(selectedService)];
  }
}
