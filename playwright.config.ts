import { defineConfig, devices } from "@playwright/test"

// E2E de resiliencia de red (Fase 0 offline). Corre contra el dev server de
// Vite con MSW activo (`VITE_APP_ENABLE_API_MOCKING=active`), en un puerto
// propio para no chocar con un `pnpm dev` abierto. No está en CI: ver
// `e2e/README` en el PR (lento y depende de timers reales de conectividad).
const PORT = 5174

export default defineConfig({
  testDir: "e2e",
  // El app shell (SW) se prueba contra un build: `playwright.pwa.config.ts`.
  testIgnore: "pwa/**",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_APP_ENABLE_API_MOCKING: "active" },
  },
})
