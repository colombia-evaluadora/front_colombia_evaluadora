import { defineConfig, devices } from "@playwright/test"

import base from "./playwright.config"

// Matriz multi-navegador del cierre offline (tarea 6.4, `docs/offline/
// CHECKLIST-MULTINAVEGADOR.md`): los mismos E2E de `e2e/` sobre Chromium,
// Firefox y WebKit (motor de Safari). Automatiza la parte reproducible del
// checklist; cuotas reales, modo privado de Safari iOS y evicción siguen
// siendo manuales. `pnpm test:e2e:matrix` (instalar antes con
// `pnpm exec playwright install chromium firefox webkit`).
export default defineConfig({
  ...base,
  use: { baseURL: base.use?.baseURL },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
})
