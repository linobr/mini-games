import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/mini-games/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        atomLab: resolve(process.cwd(), "atom-lab.html"),
      },
    },
  },
});
