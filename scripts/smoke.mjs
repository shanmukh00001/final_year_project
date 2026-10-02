// AC-DEP-001: Automated smoke test for deployed environment
const targetUrl = process.argv[2] ?? "http://localhost:4173";

// eslint-disable-next-line no-console
console.log(`Running smoke test against ${targetUrl}...`);

try {
  const res = await fetch(`${targetUrl}/api/health`);
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`Smoke test failed: /api/health returned ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  if (data.data?.status !== "ok") {
    // eslint-disable-next-line no-console
    console.error("Smoke test failed: /api/health returned invalid payload");
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log("Smoke test passed successfully.");
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Smoke test error:", err);
  process.exit(1);
}
