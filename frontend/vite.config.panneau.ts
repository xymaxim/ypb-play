import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        customElement: true,
      },
    }),
  ],
  build: {
    lib: {
      entry: "src/lib/components/panneau/AnimatedPanneau.svelte",
      name: "AnimatedPanneau",
      fileName: "panneau",
      formats: ["es"],
    },
    outDir: "dist/libs/panneau",
    rollupOptions: {
      external: ["svelte", /^svelte\//],
    },
  },
});
