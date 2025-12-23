// sa-portfolio-admin-ui/functions/api/[[path]].js
export async function onRequest(context) {
	const { request, env, params } = context;

	const ORIGIN = String(env.CMS_WORKER_ORIGIN || "")
		.trim()
		.replace(/\/+$/, "");
	if (!ORIGIN) {
		return new Response(
			JSON.stringify({ error: "Missing CMS_WORKER_ORIGIN" }, null, 2),
			{
				status: 500,
				headers: { "content-type": "application/json; charset=utf-8" },
			},
		);
	}

	const CMS_API_KEY = String(env.CMS_API_KEY || "").trim();

	const incoming = new URL(request.url);
	const path = Array.isArray(params.path)
		? params.path.join("/")
		: params.path || "";
	const upstream = new URL(`${ORIGIN}/api/${path}`);
	upstream.search = incoming.search;

	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.set("accept", "application/json");

	// Only attach the key server-side for PR writes
	if (upstream.pathname === "/api/pr") {
		if (!CMS_API_KEY) {
			return new Response(
				JSON.stringify({ error: "Missing CMS_API_KEY (Pages env)" }, null, 2),
				{
					status: 500,
					headers: { "content-type": "application/json; charset=utf-8" },
				},
			);
		}
		headers.set("x-cms-key", CMS_API_KEY);
	}

	return fetch(upstream.toString(), {
		method: request.method,
		headers,
		body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
		redirect: "manual",
	});
}
