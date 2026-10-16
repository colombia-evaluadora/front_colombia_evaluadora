import { defineConfig, devices } from "@playwright/test"

// E2E del app shell (Fase 1 offline, `openspec/changes/add-offline-reads`).
// A diferencia de `playwright.config.ts` (dev server + MSW), el Service Worker
// solo existe en un build de producción y nunca con MSW: se buildea con
// `VITE_APP_ENABLE_API_MOCKING=inactive` y se sirve con `vite preview`. No hay
// backend detrás: la API falla, que es justo lo que se quiere probar.
const PORT = 4174

export default defineConfig({
  testDir: "e2e/pwa",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { VITE_APP_ENABLE_API_MOCKING: "inactive", VITE_APP_OFFLINE: "read" },
  },
})
