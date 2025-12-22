// sa-portfolio-admin-ui/assets/functions/_lib/proxyToCmsWorker.js
// Shared helper for Cloudflare Pages Functions to forward requests to the CMS Worker.
//
// Expects env.WORKER_BASE_URL (or env.CMS_WORKER_ORIGIN) like:
//   https://sa-portfolio-cms.<your-subdomain>.workers.dev
// IMPORTANT: no trailing slash.

export async function proxyToCmsWorker(request, env, workerPath) {
	const base = String(env.WORKER_BASE_URL || env.CMS_WORKER_ORIGIN || "")
		.trim()
		.replace(/\/+$/, "");

	if (!base) {
		return new Response(
			JSON.stringify(
				{
					error: "Missing WORKER_BASE_URL (or CMS_WORKER_ORIGIN) in Pages env",
				},
				null,
				2,
			),
			{
				status: 500,
				headers: { "content-type": "application/json; charset=utf-8" },
			},
		);
	}

	// Build target URL: base + workerPath + original query string
	const srcUrl = new URL(request.url);
	const targetUrl = new URL(base + workerPath);
	targetUrl.search = srcUrl.search; // preserve ?path=... etc.

	// Clone headers & ensure JSON is not blocked by browsers
	const headers = new Headers(request.headers);
	headers.set("accept", "application/json");

	// If we’re calling the PR endpoint, attach the CMS key automatically
	if (workerPath === "/api/pr") {
		const key = String(env.CMS_API_KEY || "").trim();
		if (!key) {
			return new Response(
				JSON.stringify({ error: "Missing CMS_API_KEY in Pages env" }, null, 2),
				{
					status: 500,
					headers: { "content-type": "application/json; charset=utf-8" },
				},
			);
		}
		headers.set("x-cms-key", key);
	}

	// Forward the request
	const init = {
		method: request.method,
		headers,
		body:
			request.method === "GET" || request.method === "HEAD"
				? undefined
				: request.body,
		redirect: "manual",
	};

	const res = await fetch(targetUrl.toString(), init);

	// Pass through response (but keep it simple + readable)
	const outHeaders = new Headers(res.headers);
	outHeaders.set("cache-control", "no-store");

	return new Response(res.body, { status: res.status, headers: outHeaders });
}
