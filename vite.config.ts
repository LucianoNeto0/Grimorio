import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const isApkBuild = mode === "apk" || process.env["GRIMORIO_BUILD_TARGET"] === "apk";
  if (mode === "apk") process.env["GRIMORIO_BUILD_TARGET"] = "apk";

  return {
    define: {
      "import.meta.env.VITE_ENABLE_AI": JSON.stringify(isApkBuild ? "false" : "true"),
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
        ...(isApkBuild ? { spa: { enabled: true, prerender: { outputPath: "/index.html" } } } : {}),
      }),
      ...(!isApkBuild ? [nitro({ preset: "vercel" })] : []),
      react(),
    ],
    ...(isApkBuild ? { build: { outDir: "dist/mobile" } } : {}),
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
      tsconfigPaths: true,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: { host: "::", port: 8080 },
  };
});
