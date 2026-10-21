import { defineConfig, devices } from "@playwright/test"

// E2E de resiliencia de red (Fase 0 offline). Corre contra el dev server de
// Vite con MSW activo (`VITE_APP_ENABLE_API_MOCKING=active`), en un puerto
// propio para no chocar con un `pnpm dev` abierto. No está en CI: ver
// `e2e/README` en el PR (lento y depende de timers reales de conectividad).
// `E2E_PORT` permite correrlo junto a otro dev server de E2E (otro worktree) en 5174.
const PORT = Number(process.env.E2E_PORT ?? 5174)

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
    // Autopreparación apagada por defecto en los E2E: cada spec decide cuándo
    // preparar (los de la app instalada la prenden con `ce-offline-auto-prepare`).
    env: {
      VITE_APP_ENABLE_API_MOCKING: "active",
      VITE_APP_OFFLINE: "full",
      VITE_APP_OFFLINE_PILOT: "docente@example.com,admin@example.com,user@example.com",
      VITE_APP_OFFLINE_AUTO_PREPARE: "off",
    },
  },
})
