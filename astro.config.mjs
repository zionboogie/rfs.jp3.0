// @ts-check
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @param {string} filePath */
function readEnvFile(filePath) {
	/** @type {Record<string, string>} */
	const env = {};
	if (!existsSync(filePath)) return env;
	for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const index = trimmed.indexOf("=");
		if (index <= 0) continue;
		const key = trimmed.slice(0, index).trim();
		let value = trimmed.slice(index + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (value) env[key] = value;
	}
	return env;
}

// プリレンダーは設定評価の直後に走る。Vite は .env の非 PUBLIC_ 変数を
// バンドルへ自動では渡さないので、ここで読んで process.env と define に載せる。
for (const [key, value] of Object.entries(readEnvFile(join(projectRoot, ".env")))) {
	if (!process.env[key]) process.env[key] = value;
}
if (!process.env.WORDPRESS_API_URL) {
	const example = readEnvFile(join(projectRoot, ".env.example")).WORDPRESS_API_URL;
	if (example) process.env.WORDPRESS_API_URL = example;
}
const wordpressApiUrl = process.env.WORDPRESS_API_URL;

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
		define: wordpressApiUrl
			? { "process.env.WORDPRESS_API_URL": JSON.stringify(wordpressApiUrl) }
			: {},
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
