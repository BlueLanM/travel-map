import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/travel-map/",
  // GitHub Pages 需要设置为仓库名
  build: {
    outDir: "docs"
  },
  plugins: [react()]
});