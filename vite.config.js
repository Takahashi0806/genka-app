import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/gas": {
        target: "https://script.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: () =>
          "/macros/s/AKfycbx6Kvcbk5h_qQ1n-7yxw_UEUJltOGKtiMxwJH1kAfxharYcdV0GPi0W1oLZFCu_GOZA1Q/exec",
      },
    },
  },
});