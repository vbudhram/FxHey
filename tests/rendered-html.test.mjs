import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the FxHey release dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>FxHey! — Firefox Accounts release intelligence<\/title>/i);
  assert.match(html, /Firefox Accounts for Dummies \(i\.e\. me\)/i);
  assert.match(html, /aria-label="Deployment environment"/i);
  assert.match(html, /aria-label="Stage"[^>]+aria-pressed="false"/i);
  assert.match(html, /aria-label="Production"[^>]+aria-pressed="true"/i);
  assert.match(html, /https:\/\/accounts\.stage\.mozaws\.net\/__version__/i);
  assert.match(html, /https:\/\/api\.accounts\.firefox\.com\/__version__/i);
  assert.doesNotMatch(html, /Content server|Profile server|OAuth server/i);
  assert.match(html, /Current\s*(?:<!-- -->)?\s*Production/i);
  assert.match(html, /Train\s*(?:<!-- -->)?\s*\d+(?:<!-- -->)?\s*changes/i);
  assert.match(html, /Deployment history/i);
  assert.match(html, /aria-expanded="false"/i);
  assert.match(html, />Show</i);
  assert.doesNotMatch(html, /Git-backed|source of truth|provenance|±30 min/i);
  assert.match(html, /Search train commits/i);
  assert.match(html, /merged PRs/i);
  assert.match(html, /class="author-avatar"/i);
  assert.match(html, /aria-label="View [^"]+ on GitHub"/i);
  assert.match(html, /aria-label="Jira ticket (?:FXA|PAY|ENT)-\d+"/i);
  assert.doesNotMatch(html, /Issues &amp; PRs|All areas|scope-badge/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders an accessible train inventory", async () => {
  const response = await render("/?train=340");
  const html = await response.text();

  assert.match(html, /Skip to train changes/i);
  assert.match(html, /Search train commits/i);
  assert.match(html, /Full comparison/i);
  assert.match(html, /All times UTC/i);
});

test("selects the stage release and exact deployed tag", async () => {
  const response = await render("/?environment=stage");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /aria-label="Stage"[^>]+aria-pressed="true"/i);
  assert.match(html, /aria-label="Production"[^>]+aria-pressed="false"/i);
  assert.match(html, /Current\s*(?:<!-- -->)?\s*Stage/i);
  assert.match(html, /saved deployments/i);
  assert.match(html, /v(?:<!-- -->)?1\.340\.2/i);
});
