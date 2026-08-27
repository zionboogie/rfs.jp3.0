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
		plugins: [tailwindcss()],
		// @lucide/astro は .ts / .astro のまま公開されるため、Vite に変換させる
		resolve: {
			noExternal: ["@lucide/astro"],
		},
	},
});
