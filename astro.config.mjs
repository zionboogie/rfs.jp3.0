// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
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
});
