import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// "base" は GitHub Pages の公開URLに合わせて変更してください。
// 例: https://your-github-name.github.io/family-schedule-app/ の場合 → '/family-schedule-app/'
export default defineConfig({
  plugins: [react()],
  base: "/family-schedule-app-V3/",
});
