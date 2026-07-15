import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const HISTORY_ROOT = path.join(ROOT, "history");
const INDEX_PATH = path.join(ROOT, "data", "deploy-history.json");
const BACKFILL_MARKER = path.join(HISTORY_ROOT, ".github-deployments-backfilled");
const FXA_REPOSITORY = "mozilla/fxa";
const ENDPOINTS = [
  {
    environment: "stage",
    url: "https://accounts.stage.mozaws.net/__version__",
  },
  {
    environment: "production",
    url: "https://api.accounts.firefox.com/__version__",
  },
];

export function requestHeaders(url) {
  const isGithub = new URL(url).hostname === "api.github.com";
  const headers = {
    Accept: isGithub ? "application/vnd.github+json" : "application/json",
    "User-Agent": "FxHey-Deployment-Recorder",
  };
  if (isGithub) {
    headers["X-GitHub-Api-Version"] = "2022-11-28";
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: requestHeaders(url),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export function parseFxaVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return { train: Number(match[2]), patch: Number(match[3]) };
}

export function githubDeploymentEntry(deployment, environment) {
  const version = String(deployment.ref ?? "").replace(/^v/, "");
  const parsed = parseFxaVersion(version);
  if (!parsed || typeof deployment.sha !== "string" || !deployment.created_at) return null;

  return {
    id: `github-${environment}-${deployment.id}`,
    environment,
    version,
    ...parsed,
    tag: `v${version}`,
    commit: deployment.sha,
    sourceUpdatedAt: deployment.created_at,
    observedAt: deployment.created_at,
    evidence: "github-deployment-record",
  };
}

export function endpointObservationEntry(service, sourceUpdatedAt, observedAt) {
  const parsed = parseFxaVersion(service.version);
  if (!parsed || typeof service.commit !== "string") return null;

  return {
    id: `observed-${service.environment}-${observedAt}-${service.commit.slice(0, 12)}`,
    environment: service.environment,
    version: service.version,
    ...parsed,
    tag: `v${service.version}`,
    commit: service.commit,
    sourceUpdatedAt,
    observedAt,
    evidence: "endpoint-observation",
  };
}

function entryFileName(entry) {
  const timestamp = entry.observedAt.replace(/[:.]/g, "-");
  const id = String(entry.id).replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${timestamp}-${id}.json`;
}

async function writeEvent(entry) {
  const directory = path.join(HISTORY_ROOT, entry.environment);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, entryFileName(entry));

  try {
    await readFile(file, "utf8");
    return false;
  } catch {
    await writeFile(file, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
    return true;
  }
}

async function markerExists() {
  try {
    await readFile(BACKFILL_MARKER, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function backfillGithubDeployments() {
  if (await markerExists()) return;

  for (const environment of ["stage", "production"]) {
    for (let page = 1; ; page += 1) {
      const url = new URL(`https://api.github.com/repos/${FXA_REPOSITORY}/deployments`);
      url.searchParams.set("environment", environment);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));
      const deployments = await fetchJson(url);
      if (!Array.isArray(deployments)) throw new Error("GitHub deployments response was not an array");

      for (const deployment of deployments) {
        const entry = githubDeploymentEntry(deployment, environment);
        if (entry) await writeEvent(entry);
      }

      if (deployments.length < 100) break;
    }
  }

  await writeFile(
    BACKFILL_MARKER,
    `Imported public ${FXA_REPOSITORY} deployment records at ${new Date().toISOString()}.\n`,
    "utf8",
  );
}

async function sourceUpdatedAt(commit, observedAt) {
  try {
    const data = await fetchJson(`https://api.github.com/repos/${FXA_REPOSITORY}/commits/${commit}`);
    return data.commit?.committer?.date ?? data.commit?.author?.date ?? observedAt;
  } catch {
    return observedAt;
  }
}

async function readEventsFor(environment) {
  const directory = path.join(HISTORY_ROOT, environment);
  try {
    const names = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    return Promise.all(
      names.map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8"))),
    );
  } catch {
    return [];
  }
}

async function recordCurrentEndpoints() {
  const observedAt = new Date().toISOString();

  for (const endpoint of ENDPOINTS) {
    try {
      const service = await fetchJson(endpoint.url);
      const events = await readEventsFor(endpoint.environment);
      const latestObservation = events
        .filter((entry) => entry.evidence === "endpoint-observation")
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
      if (latestObservation?.commit === service.commit) continue;

      const entry = endpointObservationEntry(
        { ...service, environment: endpoint.environment },
        await sourceUpdatedAt(service.commit, observedAt),
        observedAt,
      );
      if (entry) await writeEvent(entry);
    } catch (error) {
      console.warn(`Could not record ${endpoint.environment}: ${error.message}`);
    }
  }
}

async function buildIndex() {
  const events = (
    await Promise.all(["stage", "production"].map((environment) => readEventsFor(environment)))
  )
    .flat()
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const contents = `${JSON.stringify(events, null, 2)}\n`;
  await mkdir(path.dirname(INDEX_PATH), { recursive: true });

  let previous = "";
  try {
    previous = await readFile(INDEX_PATH, "utf8");
  } catch {
    // The first run creates the public index.
  }
  if (previous !== contents) await writeFile(INDEX_PATH, contents, "utf8");
}

async function main() {
  if (!process.argv.includes("--index-only")) {
    await backfillGithubDeployments();
    await recordCurrentEndpoints();
  }
  await buildIndex();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
