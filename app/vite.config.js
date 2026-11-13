import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    assetsDir: "",
    chunkSizeWarningLimit: 1500, // TensorFlow.js ist groß, wird aber erst bei Bedarf geladen
    rollupOptions: {
      output: {
        entryFileNames: "app.js",
        // CSS heißt immer app.css, Schriften liegen in fonts/
        assetFileNames: info => (info.name || "").endsWith(".css") ? "app.css" : "fonts/[name]-[hash][extname]"
      }
    }
  }
});
