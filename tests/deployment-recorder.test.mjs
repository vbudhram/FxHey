import assert from "node:assert/strict";
import test from "node:test";

import {
  endpointObservationEntry,
  githubDeploymentEntry,
  parseFxaVersion,
  requestHeaders,
} from "../scripts/record-deployments.mjs";

test("parses FxA train and patch versions", () => {
  assert.deepEqual(parseFxaVersion("1.341.2"), { train: 341, patch: 2 });
  assert.equal(parseFxaVersion("train-341"), null);
});

test("maps public GitHub deployments without claiming a completion time", () => {
  const entry = githubDeploymentEntry(
    {
      id: 3032552206,
      ref: "v1.319.9",
      sha: "79be9a86a4c677ebdf5e70168a99159fb079860e",
      created_at: "2025-09-19T13:49:03Z",
    },
    "stage",
  );

  assert.equal(entry.evidence, "github-deployment-record");
  assert.equal(entry.version, "1.319.9");
  assert.equal(entry.observedAt, "2025-09-19T13:49:03Z");
});

test("maps endpoint changes as observations", () => {
  const entry = endpointObservationEntry(
    { environment: "production", version: "1.341.0", commit: "abc123def456" },
    "2026-07-15T18:00:00Z",
    "2026-07-15T18:05:00Z",
  );

  assert.equal(entry.evidence, "endpoint-observation");
  assert.equal(entry.train, 341);
  assert.equal(entry.patch, 0);
});

test("sends the workflow token only to GitHub", () => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  try {
    assert.equal(requestHeaders("https://api.github.com/repos/mozilla/fxa").Authorization, "Bearer test-token");
    assert.equal(requestHeaders("https://accounts.stage.mozaws.net/__version__").Authorization, undefined);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  }
});
