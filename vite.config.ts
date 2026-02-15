import { defineConfig } from "vite";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const defaultBase =
  process.env.GITHUB_ACTIONS === "true" && repoName ? `/${repoName}/` : "/";
const BASE_PATH = process.env.BASE_PATH ?? defaultBase;

export default defineConfig({
  base: BASE_PATH,
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true }
});
