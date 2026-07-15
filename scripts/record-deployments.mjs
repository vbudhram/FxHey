import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const HISTORY_ROOT = path.join(ROOT, "history");
const INDEX_PATH = path.join(ROOT, "data", "deploy-history.json");
const BACKFILL_MARKER = path.join(HISTORY_ROOT, ".github-deployments-backfilled");
const FXA_REPOSITORY = "mozilla/fxa";
const LEGACY_FXHEY_URL = "https://fx-hey.herokuapp.com/fxa";
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
  const hostname = new URL(url).hostname;
  const isGithub = hostname === "api.github.com";
  const isHtml = hostname === "fx-hey.herokuapp.com";
  const headers = {
    Accept: isGithub
      ? "application/vnd.github+json"
      : isHtml
        ? "text/html,application/xhtml+xml"
        : "application/json",
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: requestHeaders(url),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
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

export function parseLegacyFxHeyDate(value) {
  const match = /^(\d{2})-([A-Z][a-z]{2})-(\d{4}) (\d{2}):(\d{2}) UTC$/.exec(value);
  if (!match) return null;
  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = months[match[2]];
  if (month === undefined) return null;
  return new Date(
    Date.UTC(Number(match[3]), month, Number(match[1]), Number(match[4]), Number(match[5])),
  ).toISOString();
}

export function parseLegacyFxHeyDeployments(html) {
  const section = /<h2 id="deployments"[\s\S]*?<\/section>/.exec(html)?.[0];
  if (!section) return [];

  return [...section.matchAll(/<dt>([^<]+):<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].flatMap(
    ([, dateLabel, description]) => {
      const observedAt = parseLegacyFxHeyDate(dateLabel);
      if (!observedAt) return [];

      const deployments = new Map();
      for (const match of description.matchAll(
        /(Auth|Profile|Content|OAuth) server\s*<a[^>]+\/tree\/v(\d+\.\d+\.\d+)[^>]*>/g,
      )) {
        const service = `${match[1]} server`;
        const services = deployments.get(match[2]) ?? [];
        if (!services.includes(service)) services.push(service);
        deployments.set(match[2], services);
      }

      return [...deployments].map(([version, services]) => ({
        id: `legacy-fxhey-production-${observedAt}-${version}`,
        version,
        observedAt,
        services,
      }));
    },
  );
}

export function legacyFxHeyDeploymentEntry(deployment, commit) {
  const parsed = parseFxaVersion(deployment.version);
  if (!parsed || typeof commit !== "string" || !commit) return null;

  return {
    id: deployment.id,
    environment: "production",
    version: deployment.version,
    ...parsed,
    tag: `v${deployment.version}`,
    commit,
    sourceUpdatedAt: deployment.observedAt,
    observedAt: deployment.observedAt,
    evidence: "legacy-fxhey-record",
    services: deployment.services,
    accuracyMinutes: 30,
    sourceUrl: LEGACY_FXHEY_URL,
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

async function resolveTagCommits(tags) {
  const unresolved = new Set(tags);
  const commits = new Map();

  for (let page = 1; page <= 20 && unresolved.size; page += 1) {
    const url = new URL(`https://api.github.com/repos/${FXA_REPOSITORY}/tags`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const pageTags = await fetchJson(url);
    if (!Array.isArray(pageTags)) throw new Error("GitHub tags response was not an array");

    for (const tag of pageTags) {
      if (!unresolved.has(tag.name) || typeof tag.commit?.sha !== "string") continue;
      commits.set(tag.name, tag.commit.sha);
      unresolved.delete(tag.name);
    }
    if (pageTags.length < 100) break;
  }

  return commits;
}

async function recordLegacyFxHeyHistory() {
  const records = parseLegacyFxHeyDeployments(await fetchText(LEGACY_FXHEY_URL));
  const existing = new Set((await readEventsFor("production")).map((entry) => entry.id));
  const newRecords = records.filter((record) => !existing.has(record.id));
  if (!newRecords.length) return;

  const commits = await resolveTagCommits(
    [...new Set(newRecords.map((record) => `v${record.version}`))],
  );
  for (const record of newRecords) {
    const entry = legacyFxHeyDeploymentEntry(record, commits.get(`v${record.version}`));
    if (entry) await writeEvent(entry);
  }
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
    try {
      await recordLegacyFxHeyHistory();
    } catch (error) {
      console.warn(`Could not import original FxHey history: ${error.message}`);
    }
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
