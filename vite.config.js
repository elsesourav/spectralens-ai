import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
   plugins: [tailwindcss(), react()],
   root: resolve(__dirname, "./src"),
   resolve: {
      alias: {
         "@": resolve(__dirname, "./src"),
      },
   },
   build: {
      outDir: resolve(__dirname, "./extension"),
      rollupOptions: {
         input: {
            popup: resolve(__dirname, "./src/popup/popup.html"),
            selection: resolve(__dirname, "./src/inject/selection.html"),
            widgetWindow: resolve(__dirname, "./src/inject/widgetWindow.html"),
            options: resolve(__dirname, "./src/options/options.html"),
         },
      },
      emptyOutDir: true,
   },
   publicDir: resolve(__dirname, "./scripts"),
   base: "./",
});
