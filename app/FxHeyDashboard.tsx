"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "./lib/fxa-data";

type View = "work" | "commits";

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

function ScopeBadge({ scope }: { scope: string }) {
  return <span className={`scope-badge scope-${scope}`}>{scope}</span>;
}

export function FxHeyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("work");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const scopes = useMemo(
    () =>
      Array.from(new Set(data.commits.map((commit) => commit.scope))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [data.commits],
  );

  const filteredWorkItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.workItems.filter(
      (item) =>
        (scope === "all" || item.scope === scope) &&
        (!search || `${item.id} ${item.title} ${item.scope}`.toLowerCase().includes(search)),
    );
  }, [data.workItems, query, scope]);

  const filteredCommits = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.commits.filter(
      (commit) =>
        (scope === "all" || commit.scope === scope) &&
        (!search ||
          `${commit.shortSha} ${commit.title} ${commit.author} ${commit.issueKeys.join(" ")}`
            .toLowerCase()
            .includes(search)),
    );
  }, [data.commits, query, scope]);

  async function loadTrain(train: number) {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/train?train=${train}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The train data could not be loaded.");
      const nextData = (await response.json()) as DashboardData;
      setData(nextData);
      setQuery("");
      setScope("all");
      const url = new URL(window.location.href);
      url.searchParams.set("train", String(nextData.selectedTrain));
      window.history.replaceState({}, "", url);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The train data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  const visibleCount = view === "work" ? filteredWorkItems.length : filteredCommits.length;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#train-contents">
        Skip to train contents
      </a>

      <header className="topbar">
        <Link className="brand" href="/" aria-label="FxHey home">
          <span className="brand-mark">FxHey!</span>
          <span className="brand-subtitle">Release intelligence</span>
        </Link>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#services">Production</a>
          <a href="#train-contents">Train contents</a>
          <a href={data.compareUrl} target="_blank" rel="noreferrer">
            GitHub compare <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="status-hero" aria-labelledby="current-train-heading">
          <div className="hero-kicker">
            <span className="live-dot" aria-hidden="true" />
            Production status
          </div>
          <div className="hero-layout">
            <div className="train-lockup">
              <p className="eyebrow">Current deployed train</p>
              <h1 id="current-train-heading">
                Train <span>{data.deployedTrain}</span>
              </h1>
              <p className="hero-summary">
                Firefox Accounts is running <strong>{data.deployedTag}</strong> across all four public
                services.
              </p>
            </div>
            <div className="hero-timestamps">
              <div>
                <span>Production updated</span>
                <strong>{formatRelative(data.deploymentUpdatedAt, data.lastCheckedAt)}</strong>
                <time dateTime={data.deploymentUpdatedAt}>{formatDate(data.deploymentUpdatedAt)}</time>
              </div>
              <div>
                <span>Train tag updated</span>
                <strong>{formatRelative(data.trainUpdatedAt, data.lastCheckedAt)}</strong>
                <time dateTime={data.trainUpdatedAt}>{formatDate(data.trainUpdatedAt)}</time>
              </div>
            </div>
          </div>
          {data.source === "fallback" ? (
            <p className="data-notice" role="status">
              Live data is temporarily limited. Showing the most recent verified snapshot.
            </p>
          ) : null}
        </section>

        <section className="services-section" id="services" aria-labelledby="services-heading">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Live version endpoints</p>
              <h2 id="services-heading">Production services</h2>
            </div>
            <button
              className="quiet-button"
              type="button"
              onClick={() => loadTrain(data.selectedTrain)}
              disabled={isLoading}
            >
              {isLoading ? "Checking…" : "Refresh status"}
            </button>
          </div>
          <div className="service-grid">
            {data.services.map((service) => (
              <article className="service-card" key={service.name}>
                <div className="service-title-row">
                  <h3>{service.label}</h3>
                  <span className="service-health"><span /> live</span>
                </div>
                <p className="service-version">{service.tag}</p>
                <dl>
                  <div><dt>Train</dt><dd>{service.train}</dd></div>
                  <div><dt>Patch</dt><dd>{service.patch}</dd></div>
                  <div>
                    <dt>Commit</dt>
                    <dd>
                      <a href={`${GITHUB_REPO}/commit/${service.commit}`} target="_blank" rel="noreferrer">
                        {service.commit.slice(0, 7)}
                      </a>
                    </dd>
                  </div>
                </dl>
                <a className="endpoint-link" href={service.endpoint} target="_blank" rel="noreferrer">
                  View version endpoint <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="train-section" id="train-contents" aria-labelledby="train-heading">
          <aside className="train-sidebar">
            <p className="eyebrow">Release inventory</p>
            <h2 id="train-heading">What’s riding this train?</h2>
            <p className="sidebar-intro">
              Pick a train to see its Jira work, merged pull requests, and every commit between the
              previous train and its latest patch.
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
              <div><strong>{data.workItems.length}</strong><span>issues & PRs</span></div>
              <div><strong>{data.commits.length}</strong><span>commits</span></div>
              <div><strong>{data.pullRequestCount}</strong><span>merged PRs</span></div>
            </div>

            <div className="inventory-toolbar">
              <div className="view-tabs" role="tablist" aria-label="Train contents view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "work"}
                  onClick={() => setView("work")}
                >
                  Issues & PRs
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "commits"}
                  onClick={() => setView("commits")}
                >
                  Commits
                </button>
              </div>
              <div className="filters">
                <label className="sr-only" htmlFor="train-search">Search train contents</label>
                <input
                  id="train-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tickets, titles, authors…"
                />
                <label className="sr-only" htmlFor="scope-filter">Filter by area</label>
                <select id="scope-filter" value={scope} onChange={(event) => setScope(event.target.value)}>
                  <option value="all">All areas</option>
                  {scopes.map((option) => (
                    <option value={option} key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <p className="error-message" role="alert">{error}</p> : null}

            <div className={`inventory-list ${isLoading ? "is-loading" : ""}`}>
              {view === "work"
                ? filteredWorkItems.map((item) => (
                    <article className="inventory-row work-row" key={item.id}>
                      <div className="row-primary">
                        <div className="row-meta">
                          <a className="item-id" href={item.href} target="_blank" rel="noreferrer">
                            {item.id} <span aria-hidden="true">↗</span>
                          </a>
                          <span className="source-label">{item.source}</span>
                          <ScopeBadge scope={item.scope} />
                        </div>
                        <h3>{item.title}</h3>
                      </div>
                      <div className="row-counts">
                        <span>{item.prNumbers.length} {item.prNumbers.length === 1 ? "PR" : "PRs"}</span>
                        <span>{item.commitShas.length} {item.commitShas.length === 1 ? "commit" : "commits"}</span>
                      </div>
                    </article>
                  ))
                : filteredCommits.map((commit) => (
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
                          <ScopeBadge scope={commit.scope} />
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
                  <span>Try a broader search or choose all areas.</span>
                </div>
              ) : null}
            </div>

            <div className="inventory-footer">
              <span>Showing {visibleCount} of {view === "work" ? data.workItems.length : data.commits.length}</span>
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
