/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { VitePWA } from "vite-plugin-pwa"

import { fileURLToPath } from "node:url"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_APP_")
  // Build de emergencia del SW (docs/offline/KILL-SWITCH.md): mismo `/sw.js`,
  // pero uno que se desregistra y borra sus caches.
  const swKill = env.VITE_APP_SW_KILL === "true"
  const apiProxyTarget = env.VITE_APP_API_PROXY_TARGET || "http://localhost:8080"

  return {
    plugins: [
      react(),
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      // App shell offline (Fase 1, openspec/changes/add-offline-reads). El SW
      // se registra a mano desde `lib/offline/sw-update.ts` (no con MSW, no con
      // el kill-switch en `off`), por eso `injectRegister: false`.
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src/sw",
        filename: swKill ? "sw-kill.ts" : "sw.ts",
        injectManifest: {
          // Siempre /sw.js: el build de emergencia reemplaza al SW instalado
          // en los clientes porque comparte script URL.
          swDest: "dist/sw.js",
          // Sin `mockServiceWorker.js` (MSW nunca convive con la PWA) ni
          // `_headers` (config de Cloudflare). Incluye los chunks lazy de TODAS
          // las vistas: el precache mide ~10,6 MB (339 entradas, medido en la Fase 1), por debajo del umbral
          // de 15 MB del plan (§11 Fase 1), así que no se excluye ninguna.
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2,webmanifest}"],
          globIgnores: ["mockServiceWorker.js", "_headers"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        registerType: "prompt",
        injectRegister: false,
        devOptions: { enabled: false },
        manifest: {
          name: "Colombia Evaluadora",
          short_name: "Evaluadora",
          description: "Planeador, planilla y asistencia para docentes.",
          lang: "es",
          start_url: "/app",
          scope: "/",
          display: "standalone",
          theme_color: "#7b9e2b",
          background_color: "#ffffff",
          icons: [
            { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: false,
          // Upgrade de `/api/comms/ws` (tiempo real, comms-service) con
          // `VITE_APP_REALTIME_URL=/api/comms/ws`, igual que el Worker en deploy.
          ws: true,
        },
      },
    },
    test: {
      projects: [
        // Tests unitarios (`pnpm test`): lógica pura y handlers MSW vía
        // `msw/node`. Ninguno necesita DOM, así que corren en `node` (más
        // rápido y sin instalar jsdom). Si un test futuro necesita DOM, ponele
        // `// @vitest-environment jsdom` arriba del archivo (e instalá jsdom)
        // en lugar de cambiar el environment de todo el proyecto.
        {
          extends: true,
          test: {
            name: "unit",
            environment: "node",
            include: ["src/**/*.test.{ts,tsx}"],
            exclude: ["**/node_modules/**", "**/*.stories.*"],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [
                {
                  browser: "chromium",
                },
              ],
            },
          },
        },
      ],
    },
  }
})
