import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const proxy = {
    "/api": {
      target:
        loadEnv(mode, process.cwd(), "VITE_").VITE_API_TARGET ||
        "http://127.0.0.1:3000",
    },
  };
  return {
    plugins: [react()],
    build: { sourcemap: false, target: "es2022" },
    server: { proxy },
    preview: { proxy },
  };
});
