import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const requestedBase = env.VITE_BASE_PATH?.trim();
  const defaultBase = `/${slug(env.VITE_TEAM_NAME || "scu-china")}/`;
  const normalizedBase = requestedBase
    ? `${requestedBase.startsWith("/") ? "" : "/"}${requestedBase}`
    : defaultBase;

  return {
    base: normalizedBase.endsWith("/") ? normalizedBase : `${normalizedBase}/`,
    plugins: [react()],
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          // Keep the large 3D and physics dependencies in their own long-lived
          // chunks so a content edit does not invalidate them, and so the
          // physics engine can be fetched only once the scene asks for it.
          manualChunks: (id: string) => {
            if (id.includes("node_modules/three")) return "three";
            if (id.includes("node_modules/@dimforge/rapier3d")) return "rapier";
            return undefined;
          },
        },
      },
    },
  };
});
