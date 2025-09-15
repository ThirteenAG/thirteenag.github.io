import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
	site: "https://fusionfix.io",
	base: "/",
	trailingSlash: "always",

	vite: {
		plugins: [tailwindcss()],
	},

	// integrations: [react()],
});
