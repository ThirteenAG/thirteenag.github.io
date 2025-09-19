import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
	site: "https://fusionfix.io",
	base: "/",

	prefetch: {
		defaultStrategy: "load",
		prefetchAll: true,
	},

	vite: {
		plugins: [tailwindcss()],
	},

	integrations: [icon()],
});
