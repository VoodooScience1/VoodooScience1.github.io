// sa-portfolio-admin-ui/assets/functions/assets/[[path]].js
export async function onRequest({ request, env, params }) {
	const origin = (env.PORTFOLIO_ORIGIN || "").trim().replace(/\/+$/, "");
	if (!origin) {
		return new Response("Missing PORTFOLIO_ORIGIN", { status: 500 });
	}

	// CF can supply params.path as an array for [[path]]
	const path = Array.isArray(params.path)
		? params.path.join("/")
		: params.path || "";

	const allowedPrefixes = ["css/", "font/", "img/", "partials/", "script/"];
	if (!allowedPrefixes.some((p) => path.startsWith(p))) {
		return new Response("Forbidden asset path", { status: 403 });
	}

	const srcUrl = new URL(request.url);
	const upstreamUrl = new URL(`${origin}/${path}`);
	upstreamUrl.search = srcUrl.search; // keep querystring if any

	const upstream = await fetch(upstreamUrl.toString(), {
		method: "GET",
		headers: {
			"User-Agent": request.headers.get("user-agent") || "CF-Proxy",
			Accept: request.headers.get("accept") || "*/*",
		},
	});

	// Don’t throw if upstream is 404 etc — just pass it through
	const headers = new Headers(upstream.headers);
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");

	return new Response(upstream.body, {
		status: upstream.status,
		headers,
	});
}
