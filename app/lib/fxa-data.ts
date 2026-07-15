export type ServiceVersion = {
  name: string;
  label: string;
  endpoint: string;
  updatedAt: string;
  version: string;
  train: number;
  patch: number;
  tag: string;
  commit: string;
  repo: string;
};

export type TrainOption = {
  train: number;
  tag: string;
  patch: number;
};

export type TrainCommit = {
  sha: string;
  shortSha: string;
  title: string;
  message: string;
  author: string;
  date: string;
  href: string;
  kind: string;
  scope: string;
  issueKeys: string[];
  prNumber: number | null;
};

export type WorkItem = {
  id: string;
  title: string;
  href: string;
  source: "Jira" | "GitHub PR";
  scope: string;
  prNumbers: number[];
  commitShas: string[];
};

export type DashboardData = {
  selectedTrain: number;
  deployedTrain: number;
  deployedTag: string;
  deploymentUpdatedAt: string;
  trainUpdatedAt: string;
  headTag: string;
  headSha: string;
  baseTag: string;
  compareUrl: string;
  availableTrains: TrainOption[];
  services: ServiceVersion[];
  commits: TrainCommit[];
  workItems: WorkItem[];
  pullRequestCount: number;
  lastCheckedAt: string;
  source: "live" | "fallback";
};

type GitHubTag = {
  name: string;
  commit: { sha: string };
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  author: { login: string } | null;
  commit: {
    author: { name: string; date: string };
    committer: { date: string };
    message: string;
  };
};

type GitHubCompare = {
  html_url: string;
  head_commit: GitHubCommit;
  commits: GitHubCommit[];
};

const GITHUB_REPO = "https://github.com/mozilla/fxa";
const GITHUB_API = "https://api.github.com/repos/mozilla/fxa";
const JIRA_BASE = "https://mozilla-hub.atlassian.net/browse";

const SERVICE_ENDPOINTS = [
  {
    name: "stage",
    label: "Stage",
    endpoint: "https://accounts.stage.mozaws.net/__version__",
    fallbackVersion: "1.340.2",
    fallbackCommit: "adb62a1fa56cd7b91bb6644364e76b725618f8e8",
    fallbackUpdatedAt: "2026-07-09T18:31:45Z",
  },
  {
    name: "production",
    label: "Production",
    endpoint: "https://api.accounts.firefox.com/__version__",
    fallbackVersion: "1.340.1",
    fallbackCommit: "b02b4e4154275a21ab3bf988f1b3183dba08e107",
    fallbackUpdatedAt: "2026-07-07T00:00:20Z",
  },
] as const;

const FALLBACK_UPDATED_AT = "2026-07-09T18:31:45Z";
const FALLBACK_DEPLOYED_AT = "2026-07-07T00:00:20Z";

const FALLBACK_TAGS: GitHubTag[] = [
  { name: "v1.340.2", commit: { sha: "adb62a1fa56cd7b91bb6644364e76b725618f8e8" } },
  { name: "v1.340.1", commit: { sha: "b02b4e4154275a21ab3bf988f1b3183dba08e107" } },
  { name: "v1.340.0", commit: { sha: "e6d7f7e7da8d17de90e07e12daee089f803b54cb" } },
  { name: "v1.339.5", commit: { sha: "663a5f9230c6ce8b7311f5797d754d44b6dc8ace" } },
  { name: "v1.339.0", commit: { sha: "630479e512902ac2c898c4aea684e6d4fe0bd183" } },
  { name: "v1.338.5", commit: { sha: "0c89e2c44dfdeacbdc01860d1ca66952f00431e3" } },
  { name: "v1.338.0", commit: { sha: "02e02e6" } },
  { name: "v1.337.8", commit: { sha: "7d75cf9" } },
  { name: "v1.337.0", commit: { sha: "c00494d" } },
  { name: "v1.336.9", commit: { sha: "c32bc62" } },
  { name: "v1.336.0", commit: { sha: "20b8a79" } },
  { name: "v1.335.6", commit: { sha: "2ba94fb" } },
  { name: "v1.335.0", commit: { sha: "c01713c" } },
];

const FALLBACK_MESSAGES = [
  [
    "adb62a1fa56cd7b91bb6644364e76b725618f8e8",
    "feat(settings): update promo banner styles to match Figma (FXA-13220)",
    "vbudhram",
    "2026-07-09T18:31:45Z",
  ],
  [
    "64e22d2f2725a1c667d526e7c74cf81e5535f49d",
    "fix(passkeys): serialize WebAuthn credentials without native toJSON() (FXA-13979)",
    "vpomerleau",
    "2026-07-09T18:31:31Z",
  ],
  [
    "2485d26f63a9b6544abcad361c55b2878c248ed2",
    "feat(passkeys): track PRF-less registration retries via Glean (FXA-13896)",
    "vpomerleau",
    "2026-07-09T18:31:23Z",
  ],
  [
    "54a4ec77ae5f186db4703c968a0bb967a910a49f",
    "fix(passkeys): supply static PRF salt and silently retry without PRF (FXA-13896)",
    "vpomerleau",
    "2026-07-09T18:31:13Z",
  ],
  [
    "b02b4e4154275a21ab3bf988f1b3183dba08e107",
    "fix(passkeys): accept undefined flowQueryParams in metricsContext (FXA-13969)",
    "vpomerleau",
    "2026-07-07T00:00:20Z",
  ],
  [
    "5fc2944e0fa14740d89802d4d61377684ca98817",
    "fix(settings): VPN polish for password and service welcome flows (FXA-13784)",
    "LZoog",
    "2026-07-07T00:00:20Z",
  ],
  [
    "58e087f53e0d7f903b4396fa6ab1a9375ca89752",
    "feat(pairing): add deep-link pairing proof of concept (FXA-13863)",
    "dschom",
    "2026-07-01T15:36:46Z",
  ],
  [
    "499776d41e636293f40eecea94f900c856bf1a54",
    "chore(payments-next): remove Nimbus free-trials experiment (PAY-3776)",
    "david1alvarez",
    "2026-06-18T19:05:07Z",
  ],
] as const;

function fallbackCommits(): GitHubCommit[] {
  return FALLBACK_MESSAGES.map(([sha, message, author, date]) => ({
    sha,
    html_url: `${GITHUB_REPO}/commit/${sha}`,
    author: { login: author },
    commit: {
      author: { name: author, date },
      committer: { date },
      message,
    },
  }));
}

function fetchOptions(): RequestInit {
  return {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "FxHey-Release-Intelligence",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(8_000),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, fetchOptions());
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function parseVersion(version: string) {
  const [, train = "0", patch = "0"] = version.split(".");
  return { train: Number(train), patch: Number(patch) };
}

async function fetchServiceVersions(): Promise<ServiceVersion[]> {
  return Promise.all(
    SERVICE_ENDPOINTS.map(async (service) => {
      const data = await fetchJson<{
        version: string;
        commit: string;
        source: string;
      }>(service.endpoint);
      const { train, patch } = parseVersion(data.version);
      let updatedAt = service.fallbackUpdatedAt;
      try {
        const commit = await fetchJson<GitHubCommit>(`${GITHUB_API}/commits/${data.commit}`);
        updatedAt = commit.commit.committer.date ?? commit.commit.author.date;
      } catch {
        // A version response is still useful when GitHub's commit endpoint is rate-limited.
      }
      return {
        name: service.name,
        label: service.label,
        endpoint: service.endpoint,
        updatedAt,
        version: data.version,
        train,
        patch,
        tag: `v${data.version}`,
        commit: data.commit,
        repo: data.source.replace(/^https:\/\/github\.com\//, ""),
      };
    }),
  );
}

function fallbackServices(): ServiceVersion[] {
  return SERVICE_ENDPOINTS.map((service) => ({
    name: service.name,
    label: service.label,
    endpoint: service.endpoint,
    updatedAt: service.fallbackUpdatedAt,
    version: service.fallbackVersion,
    ...parseVersion(service.fallbackVersion),
    tag: `v${service.fallbackVersion}`,
    commit: service.fallbackCommit,
    repo: "mozilla/fxa",
  }));
}

function groupTags(tags: GitHubTag[]) {
  const grouped = new Map<number, Array<GitHubTag & { patch: number }>>();
  for (const tag of tags) {
    const match = /^v1\.(\d+)\.(\d+)$/.exec(tag.name);
    if (!match) continue;
    const train = Number(match[1]);
    const patch = Number(match[2]);
    const group = grouped.get(train) ?? [];
    group.push({ ...tag, patch });
    grouped.set(train, group);
  }
  for (const group of grouped.values()) {
    group.sort((a, b) => b.patch - a.patch);
  }
  return grouped;
}

function normalizeScope(scope: string, title: string) {
  const value = `${scope} ${title}`.toLowerCase();
  if (value.includes("passkey") || value.includes("webauthn")) return "passkeys";
  if (value.includes("payment") || value.includes("stripe") || value.includes("paypal")) return "payments";
  if (value.includes("entitlement") || value.includes("metering")) return "entitlements";
  if (value.includes("setting") || value.includes("content-server") || value.includes("ui")) return "settings";
  if (value.includes("auth") || value.includes("oauth") || value.includes("session")) return "auth";
  if (value.includes("test") || value.includes("ci") || value.includes("functional")) return "tooling";
  return scope.toLowerCase() || "platform";
}

function parseCommit(commit: GitHubCommit): TrainCommit {
  const lines = commit.commit.message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? "Untitled commit";
  const isMerge = /^Merge pull request #\d+/i.test(firstLine);
  const descriptiveLine = isMerge ? lines[1] ?? firstLine : firstLine;
  const conventional = /^(feat|fix|bug|chore|refactor|tests?|ci|docs)(?:\(([^)]+)\))?:\s*(.+)$/i.exec(
    descriptiveLine,
  );
  const kindAliases: Record<string, string> = {
    feat: "feature",
    bug: "fix",
    test: "tests",
  };
  const rawKind = conventional?.[1]?.toLowerCase() ?? (isMerge ? "merge" : "change");
  const kind = kindAliases[rawKind] ?? rawKind;
  const rawTitle = conventional?.[3] ?? descriptiveLine;
  const title = rawTitle
    .replace(/\s*\((?:FXA|PAY|ENT)-\d+\)\s*$/i, "")
    .replace(/\s*\(#\d+\)\s*$/, "")
    .trim();
  const issueKeys = Array.from(
    new Set((commit.commit.message.match(/\b(?:FXA|PAY|ENT)-\d+\b/gi) ?? []).map((key) => key.toUpperCase())),
  );
  const prMatch = /Merge pull request #(\d+)/i.exec(commit.commit.message);
  const scope = normalizeScope(conventional?.[2] ?? "", descriptiveLine);

  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    title,
    message: commit.commit.message,
    author: commit.author?.login ?? commit.commit.author.name,
    date: commit.commit.committer.date ?? commit.commit.author.date,
    href: commit.html_url,
    kind,
    scope,
    issueKeys,
    prNumber: prMatch ? Number(prMatch[1]) : null,
  };
}

function createWorkItems(commits: TrainCommit[]) {
  const items = new Map<string, WorkItem>();
  for (const commit of commits) {
    const ids = commit.issueKeys.length
      ? commit.issueKeys
      : commit.prNumber
        ? [`PR #${commit.prNumber}`]
        : [];

    for (const id of ids) {
      const isPr = id.startsWith("PR #");
      const existing = items.get(id);
      const prNumbers = Array.from(
        new Set([...(existing?.prNumbers ?? []), ...(commit.prNumber ? [commit.prNumber] : [])]),
      );
      items.set(id, {
        id,
        title: existing?.title ?? commit.title,
        href: isPr
          ? `${GITHUB_REPO}/pull/${id.replace("PR #", "")}`
          : `${JIRA_BASE}/${id}`,
        source: isPr ? "GitHub PR" : "Jira",
        scope: existing?.scope ?? commit.scope,
        prNumbers,
        commitShas: Array.from(new Set([...(existing?.commitShas ?? []), commit.sha])),
      });
    }
  }
  return Array.from(items.values());
}

async function fetchTrainCompare(baseTag: string, headTag: string) {
  return fetchJson<GitHubCompare>(
    `${GITHUB_API}/compare/${encodeURIComponent(baseTag)}...${encodeURIComponent(headTag)}`,
  );
}

function fallbackCompare(headTag: string): GitHubCompare {
  const commits = fallbackCommits();
  return {
    html_url: `${GITHUB_REPO}/compare/v1.339.0...${headTag}`,
    head_commit: commits[0],
    commits,
  };
}

export async function getDashboardData(requestedTrain?: number): Promise<DashboardData> {
  const checkedAt = new Date().toISOString();
  const [tagsResult, servicesResult] = await Promise.allSettled([
    fetchJson<GitHubTag[]>(`${GITHUB_API}/tags?per_page=100`),
    fetchServiceVersions(),
  ]);

  const tags = tagsResult.status === "fulfilled" ? tagsResult.value : FALLBACK_TAGS;
  const services = servicesResult.status === "fulfilled" ? servicesResult.value : fallbackServices();
  const groups = groupTags(tags);
  const sortedTrains = Array.from(groups.keys()).sort((a, b) => b - a);
  const deployedService = services.find((service) => service.name === "production") ?? services.at(-1);
  const deployedTrain = deployedService?.train ?? 340;
  const deploymentUpdatedAt = deployedService?.updatedAt ?? FALLBACK_DEPLOYED_AT;
  const desiredTrain = requestedTrain && groups.has(requestedTrain) ? requestedTrain : deployedTrain;
  const selectedTrain = groups.has(desiredTrain) ? desiredTrain : sortedTrains[0] ?? 340;
  const head = groups.get(selectedTrain)?.[0] ?? FALLBACK_TAGS[0];
  const previousGroup = groups.get(selectedTrain - 1) ?? [];
  const base = previousGroup.find((tag) => tag.patch === 0) ?? previousGroup.at(-1);
  const baseTag = base?.name ?? `v1.${selectedTrain - 1}.0`;

  let compare: GitHubCompare;
  let compareIsLive = true;
  try {
    compare = await fetchTrainCompare(baseTag, head.name);
  } catch {
    compare = fallbackCompare(head.name);
    compareIsLive = false;
  }

  const commits = compare.commits.map(parseCommit).reverse();
  const workItems = createWorkItems(commits);
  const pullRequestCount = new Set(
    commits.flatMap((commit) => (commit.prNumber ? [commit.prNumber] : [])),
  ).size;
  const availableTrains = sortedTrains.slice(0, 8).map((train) => {
    const latest = groups.get(train)?.[0];
    return {
      train,
      tag: latest?.name ?? `v1.${train}.0`,
      patch: latest?.patch ?? 0,
    };
  });
  return {
    selectedTrain,
    deployedTrain,
    deployedTag: deployedService?.tag ?? `v1.${deployedTrain}.0`,
    deploymentUpdatedAt,
    trainUpdatedAt: compare.head_commit?.commit.committer.date ?? FALLBACK_UPDATED_AT,
    headTag: head.name,
    headSha: compare.head_commit?.sha ?? head.commit.sha,
    baseTag,
    compareUrl: compare.html_url,
    availableTrains,
    services,
    commits,
    workItems,
    pullRequestCount,
    lastCheckedAt: checkedAt,
    source:
      tagsResult.status === "fulfilled" && servicesResult.status === "fulfilled" && compareIsLive
        ? "live"
        : "fallback",
  };
}
