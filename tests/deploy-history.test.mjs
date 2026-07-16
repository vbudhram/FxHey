import assert from "node:assert/strict";
import test from "node:test";
import { readDeploymentHistory } from "../app/lib/deploy-history.ts";

test("returns the complete saved deployment history", async () => {
  const originalFetch = globalThis.fetch;
  const currentCommit = "a".repeat(40);
  const current = {
    id: "current",
    environment: "production",
    version: "1.340.1",
    train: 340,
    patch: 1,
    tag: "v1.340.1",
    commit: currentCommit,
    sourceUpdatedAt: "2026-07-15T00:00:00Z",
    observedAt: "2026-07-15T00:00:00Z",
    evidence: "endpoint-observation",
  };
  const archive = Array.from({ length: 8 }, (_, index) => ({
    ...current,
    id: `archive-${index}`,
    version: `1.${339 - index}.0`,
    train: 339 - index,
    tag: `v1.${339 - index}.0`,
    commit: String(index).repeat(40),
    observedAt: `2026-07-${String(14 - index).padStart(2, "0")}T00:00:00Z`,
    evidence: "legacy-fxhey-record",
  }));

  globalThis.fetch = async () => new Response(JSON.stringify([current, ...archive]));

  try {
    const rows = await readDeploymentHistory([
      {
        name: "production",
        label: "Production",
        endpoint: "https://example.com/__version__",
        updatedAt: current.sourceUpdatedAt,
        version: current.version,
        train: current.train,
        patch: current.patch,
        tag: current.tag,
        commit: current.commit,
        repo: "mozilla/fxa",
      },
    ], "production");

    assert.equal(rows.length, 9);
    assert.equal(rows.at(-1)?.id, "archive-7");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
