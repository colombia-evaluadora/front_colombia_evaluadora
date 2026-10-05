/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

import { fileURLToPath } from "node:url"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_APP_")
  const apiProxyTarget = env.VITE_APP_API_PROXY_TARGET || "http://localhost:8080"

  return {
    plugins: [
      react(),
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset()],
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
