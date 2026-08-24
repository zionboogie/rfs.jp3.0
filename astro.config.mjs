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
	},
});
