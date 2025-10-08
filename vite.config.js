import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  esbuild: {
    target: "esnext",
    supported: {
      "import-attributes": true,
    },
  },
  ssr: {
    noExternal: ["@prisma/client"],
  },
  optimizeDeps: {
    exclude: ["@prisma/client"],
    include: ["@shopify/polaris", "@shopify/shopify-app-remix"],
  },
});