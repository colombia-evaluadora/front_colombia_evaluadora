/**
 * Única detección de "¿la app corre instalada?" (decisión del líder,
 * 2026-11): la app INSTALADA (PWA en ventana propia) es el equipo PERSONAL
 * del docente; la web en una pestaña del navegador es un equipo COMPARTIDO.
 * Así nadie tiene que responder "¿este equipo es compartido?" al iniciar
 * sesión. Chromium y Firefox lo exponen con `display-mode`; Safari iOS con
 * `navigator.standalone`.
 */

/** `display-mode` de una app instalada (ventana propia, sin la barra del navegador). */
export const INSTALLED_DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui"] as const

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return false
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { standalone?: boolean })
  if (nav?.standalone === true) return true
  return INSTALLED_DISPLAY_MODES.some(
    (mode) => typeof window.matchMedia === "function" && window.matchMedia(`(display-mode: ${mode})`).matches === true,
  )
}
