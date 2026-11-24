import type { BrowserContext, Page } from "@playwright/test"

/**
 * Decisión del líder (2026-11): la app INSTALADA es el equipo personal y la web
 * en una pestaña es un equipo compartido (`src/lib/offline/install-detection.ts`).
 * Ya no existe el checkbox "Este es un equipo compartido": para que un E2E use el
 * equipo como personal se emula la app instalada. Playwright no emula
 * `display-mode` con `emulateMedia`, así que se reemplaza `matchMedia`.
 */
function scriptAppInstalada() {
  const original = window.matchMedia.bind(window)
  window.matchMedia = (query: string) => {
    if (/\(display-mode:\s*standalone\)/.test(query)) {
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList
    }
    return original(query)
  }
}

export async function emularAppInstalada(target: Page | BrowserContext) {
  await target.addInitScript(scriptAppInstalada)
}

/**
 * Para usar en el login ya abierto (con correo y contraseña escritos): si la
 * página todavía no emula la app instalada, agrega el script, recarga y vuelve a
 * escribir las credenciales (el modo del equipo se decide al montar el form).
 */
export async function usarComoEquipoPersonal(page: Page) {
  const instalada = await page.evaluate(() => window.matchMedia("(display-mode: standalone)").matches)
  if (instalada) return
  const correo = page.getByLabel("Correo o número de documento")
  const clave = page.getByLabel("Contraseña", { exact: true })
  const email = await correo.inputValue()
  const password = await clave.inputValue()
  await emularAppInstalada(page)
  await page.reload()
  await correo.fill(email)
  await clave.fill(password)
}
