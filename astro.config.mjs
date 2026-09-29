// @ts-check
import { writeFile } from "node:fs/promises";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

// https://astro.build/config
export default defineConfig({
	site: "https://rfs.jp",
	server: {
		host: true,
		open: true,
	},
	vite: {
		plugins: [
			tailwindcss(),
			{
				name: "wp-html-permalinks",
				configureServer(server) {
					server.middlewares.use((req, _res, next) => {
						if (!req.url) {
							next();
							return;
						}
						const [path, query] = req.url.split("?");
						if (/\.html\/?$/i.test(path)) {
							req.url = `${path.replace(/\.html\/?$/i, "/")}${query ? `?${query}` : ""}`;
						}
						next();
					});
				},
			},
		],
		// @lucide/astro は .ts / .astro のまま公開されるため、Vite に変換させる
		resolve: {
			noExternal: ["@lucide/astro"],
		},
	},
	integrations: [
		{
			name: "learn-article-redirects-nginx",
			hooks: {
				"astro:build:done": async ({ dir }) => {
					const env = loadEnv("production", process.cwd(), "");
					for (const [key, value] of Object.entries(env)) {
						if (process.env[key] === undefined) process.env[key] = value;
					}
					const { formatLearnRedirectsNginx, getLearnArticleRedirects } = await import(
						"./src/lib/wordpress.ts"
					);
					const redirects = await getLearnArticleRedirects();
					const out = new URL("learn-article-redirects.nginx", dir);
					await writeFile(out, formatLearnRedirectsNginx(redirects), "utf8");
				},
			},
		},
	],
});
