"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardData, EnvironmentName } from "./lib/fxa-data";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatRelative(date: string, from: string) {
  const elapsed = new Date(from).getTime() - new Date(date).getTime();
  const minutes = Math.max(0, Math.round(elapsed / 60_000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

export function FxHeyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const activeService =
    data.services.find((service) => service.name === data.selectedEnvironment) ?? data.services[0];

  const filteredCommits = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.commits.filter(
      (commit) =>
        (!search ||
          `${commit.shortSha} ${commit.title} ${commit.author} ${commit.issueKeys.join(" ")}`
            .toLowerCase()
            .includes(search)),
    );
  }, [data.commits, query]);

  async function loadDashboard(environment: EnvironmentName, train?: number) {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ environment });
      if (train !== undefined) params.set("train", String(train));
      const response = await fetch(`/api/train?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The train data could not be loaded.");
      const nextData = (await response.json()) as DashboardData;
      setData(nextData);
      setQuery("");
      const url = new URL(window.location.href);
      url.searchParams.set("train", String(nextData.selectedTrain));
      url.searchParams.set("environment", nextData.selectedEnvironment);
      window.history.replaceState({}, "", url);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The train data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  function loadTrain(train: number) {
    return loadDashboard(data.selectedEnvironment, train);
  }

  function loadEnvironment(environment: EnvironmentName) {
    if (environment === data.selectedEnvironment) return;
    void loadDashboard(environment);
  }

  const visibleCount = filteredCommits.length;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#train-contents">
        Skip to train commits
      </a>

      <header className="page-header">
        <Link className="brand" href="/" aria-label="FxHey home">
          <span className="brand-mark">FxHey!</span>
        </Link>
        <p className="tagline">Firefox Accounts for Dummies (i.e. me)</p>

        <div className="environment-bar">
          <span className="environment-label">Environment</span>
          <div className="environment-toggle" role="group" aria-label="Deployment environment">
            <button
              type="button"
              aria-label="Stage"
              aria-pressed={data.selectedEnvironment === "stage"}
              onClick={() => loadEnvironment("stage")}
              disabled={isLoading}
            >
              Stage
            </button>
            <button
              type="button"
              aria-label="Production"
              aria-pressed={data.selectedEnvironment === "production"}
              onClick={() => loadEnvironment("production")}
              disabled={isLoading}
            >
              Prod
            </button>
          </div>
          <button
            className="quiet-button"
            type="button"
            onClick={() => loadDashboard(data.selectedEnvironment, data.selectedTrain)}
            disabled={isLoading}
          >
            {isLoading ? "Checking…" : "Refresh"}
          </button>
        </div>

        <div className="headline-status">
          <p><strong>{activeService?.label ?? "Release"}</strong></p>
          <span aria-hidden="true">·</span>
          <p><strong>Train</strong> {data.deployedTrain}</p>
          <span aria-hidden="true">·</span>
          <p>
            <strong>Updated</strong>{" "}
            <abbr title={data.deploymentUpdatedAt}>
              {formatRelative(data.deploymentUpdatedAt, data.lastCheckedAt)}
            </abbr>
          </p>
        </div>
        <p className="tag-update">
          Latest tag <a href={data.compareUrl} target="_blank" rel="noreferrer">{data.headTag}</a>
          {" · updated "}
          <abbr title={formatDate(data.trainUpdatedAt)}>
            {formatRelative(data.trainUpdatedAt, data.lastCheckedAt)}
          </abbr>
        </p>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#services">Environments</a>
          <a href="#train-contents">Train commits</a>
          <a href={data.compareUrl} target="_blank" rel="noreferrer">
            GitHub compare
          </a>
        </nav>
        {data.source === "fallback" ? (
          <p className="data-notice" role="status">
            Live data is temporarily limited. Showing the most recent verified snapshot.
          </p>
        ) : null}
      </header>

      <main>
        <section className="services-section" id="services" aria-labelledby="services-heading">
          <h1 className="sr-only" id="services-heading">Deployment environment</h1>
          <div className="service-grid">
            {activeService ? (
              <article className="service-card" key={activeService.name}>
                <div className="service-card-lead">
                  <div>
                    <p className="eyebrow">{activeService.label} release</p>
                    <h2>v{activeService.version}</h2>
                    <p>Train {activeService.train} · patch {activeService.patch}</p>
                  </div>
                  <a className="endpoint-link" href={activeService.endpoint} target="_blank" rel="noreferrer">
                    Open version endpoint <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <dl className="service-facts">
                  <div>
                    <dt>Updated</dt>
                    <dd>
                      <abbr title={formatDate(activeService.updatedAt)}>
                        {formatRelative(activeService.updatedAt, data.lastCheckedAt)}
                      </abbr>
                    </dd>
                  </div>
                  <div>
                    <dt>Repository</dt>
                    <dd><a href={GITHUB_REPO} target="_blank" rel="noreferrer">{activeService.repo}</a></dd>
                  </div>
                  <div>
                    <dt>Tag</dt>
                    <dd>
                      <a href={`${GITHUB_REPO}/tree/${activeService.tag}`} target="_blank" rel="noreferrer">
                        {activeService.tag}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Commit</dt>
                    <dd>
                      <a href={`${GITHUB_REPO}/commit/${activeService.commit}`} target="_blank" rel="noreferrer">
                        {activeService.commit.slice(0, 7)}
                      </a>
                    </dd>
                  </div>
                </dl>
              </article>
            ) : null}
          </div>
        </section>

        <section className="train-section" id="train-contents" aria-labelledby="train-heading">
          <aside className="train-sidebar">
            <p className="eyebrow">{activeService?.label ?? "Release"} inventory</p>
            <h2 id="train-heading">What’s riding this train?</h2>
            <p className="sidebar-intro">
              Pick a train to see every GitHub commit between the previous train and its latest
              patch. Jira tickets appear only when a commit message references one.
            </p>

            <label className="select-label" htmlFor="train-select">Train</label>
            <div className="select-wrap">
              <select
                id="train-select"
                value={data.selectedTrain}
                onChange={(event) => loadTrain(Number(event.target.value))}
                disabled={isLoading}
              >
                {data.availableTrains.map((option) => (
                  <option value={option.train} key={option.train}>
                    Train {option.train} · {option.tag}
                  </option>
                ))}
              </select>
            </div>

            <dl className="train-facts">
              <div><dt>Range</dt><dd>{data.baseTag} → {data.headTag}</dd></div>
              <div><dt>Latest tag</dt><dd>{data.headTag}</dd></div>
              <div><dt>Head commit</dt><dd>{data.headSha.slice(0, 7)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(data.trainUpdatedAt)}</dd></div>
            </dl>

            <a className="compare-link" href={data.compareUrl} target="_blank" rel="noreferrer">
              Open full comparison <span aria-hidden="true">↗</span>
            </a>
          </aside>

          <div className="inventory-panel" aria-busy={isLoading}>
            <div className="inventory-summary">
              <div><strong>{data.commits.length}</strong><span>commits</span></div>
              <div><strong>{data.pullRequestCount}</strong><span>merged PRs</span></div>
            </div>

            <div className="inventory-toolbar">
              <div className="filters">
                <label className="sr-only" htmlFor="train-search">Search train commits</label>
                <input
                  id="train-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search commits, tickets, authors…"
                />
              </div>
            </div>

            {error ? <p className="error-message" role="alert">{error}</p> : null}

            <div className={`inventory-list ${isLoading ? "is-loading" : ""}`}>
              {filteredCommits.map((commit) => (
                <article className="inventory-row commit-row" key={commit.sha}>
                  <div className="commit-rail">
                    <span className="commit-dot" aria-hidden="true" />
                    <span className="commit-line" aria-hidden="true" />
                  </div>
                  <div className="row-primary">
                    <div className="row-meta">
                      <a className="item-id mono" href={commit.href} target="_blank" rel="noreferrer">
                        {commit.shortSha}
                      </a>
                      <span className="kind-label">{commit.kind}</span>
                      {commit.prNumber ? (
                        <a className="inline-pr" href={`${GITHUB_REPO}/pull/${commit.prNumber}`} target="_blank" rel="noreferrer">
                          PR #{commit.prNumber}
                        </a>
                      ) : null}
                      {commit.issueKeys.slice(0, 2).map((key) => (
                        <a className="inline-issue" href={`${JIRA_BASE}/${key}`} target="_blank" rel="noreferrer" key={key}>
                          {key}
                        </a>
                      ))}
                    </div>
                    <h3>{commit.title}</h3>
                    <p>by {commit.author}</p>
                  </div>
                  <time dateTime={commit.date}>{formatShortDate(commit.date)}</time>
                </article>
              ))}

              {!visibleCount && !isLoading ? (
                <div className="empty-state">
                  <strong>No matches in this train.</strong>
                  <span>Try a broader search.</span>
                </div>
              ) : null}
            </div>

            <div className="inventory-footer">
              <span>Showing {visibleCount} of {data.commits.length} commits</span>
              <span>Checked {formatRelative(data.lastCheckedAt, new Date().toISOString())}</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>
          Built from Mozilla’s public FxA version endpoints and GitHub history. Inspired by the
          original <a href="https://github.com/philbooth/FxHey" target="_blank" rel="noreferrer">FxHey</a> by Phil Booth.
        </p>
        <span>All times UTC.</span>
      </footer>
    </div>
  );
}

const GITHUB_REPO = "https://github.com/mozilla/fxa";
const JIRA_BASE = "https://mozilla-hub.atlassian.net/browse";
