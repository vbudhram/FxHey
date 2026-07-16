"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import {
  ChevronDown,
  Clock3,
  ExternalLink,
  GitCommitHorizontal,
  GitCompareArrows,
  GitPullRequest,
  History,
  RefreshCw,
  Search,
  Tag,
  Ticket,
  UserRound,
} from "lucide-react";
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

function deploymentEvidenceLabel(evidence: DashboardData["deployHistory"][number]["evidence"]) {
  if (evidence === "endpoint-observation") return "First seen";
  if (evidence === "legacy-fxhey-record") return "Original FxHey record";
  if (evidence === "github-deployment-record") return "GitHub deployment";
  return "Current release";
}

type DeploymentEntry = DashboardData["deployHistory"][number];

function deploymentGapLabel(fromTrain: number, toTrain: number) {
  if (fromTrain > toTrain) return null;
  if (fromTrain === toTrain) return `Train ${fromTrain}`;
  return `Trains ${fromTrain}–${toTrain}`;
}

function DeploymentTimeline({
  deployments,
  activeCommit,
}: {
  deployments: DeploymentEntry[];
  activeCommit?: string;
}) {
  return (
    <ol className="deploy-timeline">
      {deployments.map((deployment) => {
        const isCurrentDeployment = deployment.commit === activeCommit;
        return (
          <li className={isCurrentDeployment ? "is-current" : ""} key={deployment.id ?? deployment.commit}>
            <span className="deploy-dot" aria-hidden="true" />
            <article>
              <div className="deploy-version">
                <div className="deploy-version-row">
                  <a href={`${GITHUB_REPO}/tree/${deployment.tag}`} target="_blank" rel="noreferrer">
                    v{deployment.version}
                  </a>
                  {isCurrentDeployment ? <span>Current</span> : null}
                </div>
                <p>Train {deployment.train} · patch {deployment.patch}</p>
              </div>
              <div className="deploy-date">
                <span>{deploymentEvidenceLabel(deployment.evidence)}</span>
                <time dateTime={deployment.observedAt}>{formatDate(deployment.observedAt)}</time>
              </div>
              <a className="deploy-commit" href={`${GITHUB_REPO}/commit/${deployment.commit}`} target="_blank" rel="noreferrer">
                <GitCommitHorizontal aria-hidden="true" />
                {deployment.commit.slice(0, 7)}
                <ExternalLink aria-hidden="true" />
              </a>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function FxHeyDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const activeService =
    data.services.find((service) => service.name === data.selectedEnvironment) ?? data.services[0];
  const observedDeployments = data.deployHistory.filter(
    (deployment) =>
      deployment.evidence === "endpoint-observation" ||
      deployment.evidence === "current-snapshot",
  );
  const archivedDeployments = data.deployHistory.filter(
    (deployment) =>
      deployment.evidence === "legacy-fxhey-record" ||
      deployment.evidence === "github-deployment-record",
  );
  const firstObservation = observedDeployments.at(-1);
  const latestArchiveRecord = archivedDeployments[0];
  const missingTrainRange =
    firstObservation && latestArchiveRecord
      ? deploymentGapLabel(latestArchiveRecord.train + 1, firstObservation.train - 1)
      : null;

  const filteredCommits = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.commits.filter(
      (commit) =>
        !search ||
        `${commit.shortSha} ${commit.title} ${commit.author} ${commit.issueKeys.join(" ")} ${commit.prNumber ?? ""}`
          .toLowerCase()
          .includes(search),
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

  function loadEnvironment(environment: EnvironmentName) {
    if (environment === data.selectedEnvironment) return;
    void loadDashboard(environment);
  }

  const visibleCount = filteredCommits.length;
  const isViewingDeployedTrain = data.selectedTrain === data.deployedTrain;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#train-contents">
        Skip to train changes
      </a>

      <header className="page-header">
        <div className="brand-block">
          <Link className="brand" href="/" aria-label="FxHey home">
            <span className="brand-mark">FxHey!</span>
          </Link>
          <p className="tagline">Firefox Accounts for Dummies (i.e. me)</p>
        </div>

        <div className="header-controls">
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
            <RefreshCw aria-hidden="true" />
            {isLoading ? "Checking…" : "Refresh"}
          </button>
        </div>
      </header>

      <main>
        <section className="release-card" aria-labelledby="release-heading">
          <div className="release-lead">
            <p className="eyebrow">Current {activeService?.label ?? "release"}</p>
            <h1 id="release-heading">v{activeService?.version}</h1>
            <p className="release-summary">
              Train {activeService?.train} · updated{" "}
              <abbr title={activeService ? formatDate(activeService.updatedAt) : undefined}>
                {activeService ? formatRelative(activeService.updatedAt, data.lastCheckedAt) : "recently"}
              </abbr>
            </p>
          </div>

          <div className="release-actions">
            {activeService ? (
              <>
                <a className="primary-link" href={`${GITHUB_REPO}/tree/${activeService.tag}`} target="_blank" rel="noreferrer">
                  <FaGithub aria-hidden="true" /> View release <ExternalLink aria-hidden="true" />
                </a>
                <a className="text-link" href={activeService.endpoint} target="_blank" rel="noreferrer">
                  Version endpoint <ExternalLink aria-hidden="true" />
                </a>
              </>
            ) : null}
          </div>

          {activeService ? (
            <dl className="release-facts">
              <div>
                <dt><Tag aria-hidden="true" /> Tag</dt>
                <dd>
                  <a href={`${GITHUB_REPO}/tree/${activeService.tag}`} target="_blank" rel="noreferrer">
                    {activeService.tag}
                  </a>
                </dd>
              </div>
              <div>
                <dt><GitCommitHorizontal aria-hidden="true" /> Commit</dt>
                <dd>
                  <a href={`${GITHUB_REPO}/commit/${activeService.commit}`} target="_blank" rel="noreferrer">
                    {activeService.commit.slice(0, 7)}
                  </a>
                </dd>
              </div>
              <div>
                <dt><Clock3 aria-hidden="true" /> Checked</dt>
                <dd>{formatRelative(data.lastCheckedAt, new Date().toISOString())}</dd>
              </div>
            </dl>
          ) : null}

          {data.source === "fallback" ? (
            <p className="data-notice" role="status">
              Live data is temporarily unavailable. Showing the latest saved snapshot.
            </p>
          ) : null}
        </section>

        <section className={`deploy-history-section ${isHistoryOpen ? "is-open" : ""}`} id="deploy-history">
          <button
            className="history-toggle"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-controls="deploy-history-content"
            onClick={() => setIsHistoryOpen((open) => !open)}
          >
            <span className="history-toggle-icon" aria-hidden="true"><History /></span>
            <span className="history-toggle-copy">
              <strong>Deployment history</strong>
              <span>
                {data.deployHistory.length
                  ? `${data.deployHistory.length} recent ${data.selectedEnvironment === "production" ? "production" : "stage"} records`
                  : "No saved deployments"}
              </span>
            </span>
            <span className="history-toggle-action">
              {isHistoryOpen ? "Hide" : "Show"}
              <ChevronDown aria-hidden="true" />
            </span>
          </button>

          {isHistoryOpen ? (
            <div className="deploy-history-content" id="deploy-history-content">
              <div className="history-intro">
                <p>
                  Recent releases recorded from FxA version checks and the original FxHey archive.
                </p>
                <a href="https://github.com/vbudhram/FxHey/tree/main/history" target="_blank" rel="noreferrer">
                  <FaGithub aria-hidden="true" /> View records <ExternalLink aria-hidden="true" />
                </a>
              </div>

              {observedDeployments.length ? (
                <section className="deploy-group" aria-labelledby="recent-deployments-heading">
                  <div className="deploy-group-heading">
                    <h2 id="recent-deployments-heading">Recent checks</h2>
                    <span>Every 5 minutes</span>
                  </div>
                  <DeploymentTimeline deployments={observedDeployments} activeCommit={activeService?.commit} />
                </section>
              ) : null}

              {missingTrainRange ? (
                <p className="history-gap">
                  <strong>{missingTrainRange}</strong> do not have a saved deployment record.
                </p>
              ) : null}

              {archivedDeployments.length ? (
                <section className="deploy-group" aria-labelledby="older-deployments-heading">
                  <div className="deploy-group-heading">
                    <h2 id="older-deployments-heading">Earlier releases</h2>
                    <span>{archivedDeployments.length} shown</span>
                  </div>
                  <DeploymentTimeline deployments={archivedDeployments} />
                </section>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="train-section" id="train-contents" aria-labelledby="train-heading">
          <div className="train-heading-row">
            <div>
              <div className="train-title-line">
                <p className="eyebrow">Release contents</p>
                {isViewingDeployedTrain ? <span className="deployed-badge">Deployed</span> : null}
              </div>
              <h2 id="train-heading">Train {data.selectedTrain} changes</h2>
              <p className="train-range">
                {data.baseTag} <span aria-hidden="true">→</span> {data.headTag} · updated{" "}
                <abbr title={formatDate(data.trainUpdatedAt)}>
                  {formatRelative(data.trainUpdatedAt, data.lastCheckedAt)}
                </abbr>
              </p>
            </div>

            <div className="train-picker">
              <label htmlFor="train-select">View train</label>
              <div className="select-wrap">
                <select
                  id="train-select"
                  value={data.selectedTrain}
                  onChange={(event) => void loadDashboard(data.selectedEnvironment, Number(event.target.value))}
                  disabled={isLoading}
                >
                  {data.availableTrains.map((option) => (
                    <option value={option.train} key={option.train}>
                      Train {option.train} · {option.tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="inventory-panel" aria-busy={isLoading}>
            <div className="inventory-summary">
              <div>
                <GitCommitHorizontal aria-hidden="true" />
                <strong>{data.commits.length}</strong><span>commits</span>
              </div>
              <div>
                <GitPullRequest aria-hidden="true" />
                <strong>{data.pullRequestCount}</strong><span>merged PRs</span>
              </div>
              <div className="summary-updated">
                <GitCompareArrows aria-hidden="true" />
                <span>Head</span>
                <a href={`${GITHUB_REPO}/commit/${data.headSha}`} target="_blank" rel="noreferrer">
                  {data.headSha.slice(0, 7)}
                </a>
              </div>
            </div>

            <div className="inventory-toolbar">
              <div className="search-wrap">
                <Search aria-hidden="true" />
                <label className="sr-only" htmlFor="train-search">Search train commits</label>
                <input
                  id="train-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search commits, tickets, or people"
                />
              </div>
              <a className="compare-link" href={data.compareUrl} target="_blank" rel="noreferrer">
                <FaGithub aria-hidden="true" /> Full comparison <ExternalLink aria-hidden="true" />
              </a>
            </div>

            {error ? <p className="error-message" role="alert">{error}</p> : null}

            <div className={`inventory-list ${isLoading ? "is-loading" : ""}`}>
              {filteredCommits.map((commit) => (
                <article className="commit-row" key={commit.sha}>
                  <div className="commit-person">
                    {commit.authorAvatar && commit.authorHref ? (
                      <a
                        className="author-avatar-link"
                        href={commit.authorHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${commit.author} on GitHub`}
                      >
                        {/* GitHub avatars are third-party identity images and should stay at their source URL. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="author-avatar" src={commit.authorAvatar} alt="" width="36" height="36" />
                      </a>
                    ) : (
                      <span className="author-avatar author-avatar-fallback" aria-hidden="true">
                        <UserRound />
                      </span>
                    )}
                  </div>

                  <div className="commit-main">
                    <h3>
                      <a href={commit.href} target="_blank" rel="noreferrer">{commit.title}</a>
                    </h3>
                    <div className="commit-meta">
                      <span>
                        by{" "}
                        {commit.authorHref ? (
                          <a href={commit.authorHref} target="_blank" rel="noreferrer">{commit.author}</a>
                        ) : (
                          commit.author
                        )}
                      </span>
                      <a className="commit-sha" href={commit.href} target="_blank" rel="noreferrer">
                        <GitCommitHorizontal aria-hidden="true" /> {commit.shortSha}
                      </a>
                      {commit.prNumber ? (
                        <a
                          className="inline-pr"
                          href={`${GITHUB_REPO}/pull/${commit.prNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`GitHub pull request ${commit.prNumber}`}
                        >
                          <GitPullRequest aria-hidden="true" /> PR #{commit.prNumber}
                        </a>
                      ) : null}
                      {commit.issueKeys.slice(0, 2).map((key) => (
                        <a
                          className="inline-issue"
                          href={`${JIRA_BASE}/${key}`}
                          target="_blank"
                          rel="noreferrer"
                          key={key}
                          aria-label={`Jira ticket ${key}`}
                        >
                          <Ticket aria-hidden="true" /> {key}
                        </a>
                      ))}
                    </div>
                  </div>
                  <time dateTime={commit.date}>{formatShortDate(commit.date)}</time>
                </article>
              ))}

              {!visibleCount && !isLoading ? (
                <div className="empty-state">
                  <strong>No matching commits</strong>
                  <span>Try a different search.</span>
                </div>
              ) : null}
            </div>

            <div className="inventory-footer">
              <span>Showing {visibleCount} of {data.commits.length} commits</span>
              <span>All times UTC</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>
          Data from Mozilla’s public FxA version endpoints and GitHub. Inspired by the original{" "}
          <a href="https://github.com/philbooth/FxHey" target="_blank" rel="noreferrer">
            FxHey
          </a>.
        </p>
      </footer>
    </div>
  );
}

const GITHUB_REPO = "https://github.com/mozilla/fxa";
const JIRA_BASE = "https://mozilla-hub.atlassian.net/browse";
