import type { EnvironmentName, ServiceVersion } from "./fxa-data";

export type DeploymentEvidence =
  | "endpoint-observation"
  | "github-deployment-record"
  | "current-snapshot";

export type DeploymentHistoryEntry = {
  id: string | number | null;
  environment: EnvironmentName;
  version: string;
  train: number;
  patch: number;
  tag: string;
  commit: string;
  sourceUpdatedAt: string;
  observedAt: string;
  evidence: DeploymentEvidence;
};

const HISTORY_URL =
  "https://raw.githubusercontent.com/vbudhram/FxHey/main/data/deploy-history.json";

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

function isHistoryEntry(value: unknown): value is DeploymentHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<DeploymentHistoryEntry>;
  return (
    (entry.environment === "stage" || entry.environment === "production") &&
    typeof entry.version === "string" &&
    typeof entry.train === "number" &&
    typeof entry.patch === "number" &&
    typeof entry.tag === "string" &&
    typeof entry.commit === "string" &&
    typeof entry.sourceUpdatedAt === "string" &&
    typeof entry.observedAt === "string" &&
    (entry.evidence === "endpoint-observation" ||
      entry.evidence === "github-deployment-record")
  );
}

export async function readDeploymentHistory(
  services: ServiceVersion[],
  selectedEnvironment: EnvironmentName,
): Promise<DeploymentHistoryEntry[]> {
  const selectedService =
    services.find((service) => service.name === selectedEnvironment) ?? services[0];
  if (!selectedService) return [];

  try {
    const response = await fetch(HISTORY_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`History request failed with ${response.status}`);

    const entries = (await response.json()) as unknown;
    if (!Array.isArray(entries)) throw new Error("History response was not an array");

    const history = entries
      .filter(isHistoryEntry)
      .filter((entry) => entry.environment === selectedEnvironment)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

    if (!history.length) return [currentSnapshot(selectedService)];

    const observations = history
      .filter((entry) => entry.evidence === "endpoint-observation")
      .slice(0, 6);
    const archive = history
      .filter((entry) => entry.evidence === "github-deployment-record")
      .slice(0, 6);
    const currentObservations = observations.some(
      (entry) => entry.commit === selectedService.commit,
    )
      ? observations
      : [currentSnapshot(selectedService), ...observations].slice(0, 6);

    return [...currentObservations, ...archive];
  } catch {
    return [currentSnapshot(selectedService)];
  }
}
