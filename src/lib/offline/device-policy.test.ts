import { afterEach, describe, expect, it, vi } from "vitest"

const mode = vi.hoisted(() => ({ value: "read" as "off" | "read" | "full" }))
vi.mock("@/lib/offline/offline-mode", () => ({ getOfflineMode: () => mode.value }))
// Piloto vacío: fuera de la app instalada nadie puede ser equipo personal.
vi.mock("@/lib/offline/pilot", () => ({
  canChoosePersonalDevice: () => false,
  isOfflinePilotUser: () => false,
}))

import {
  canUsePersonalDevice,
  isInstalledPersonalDevice,
  isPersonalDeviceAllowed,
  logoutKeepsDeviceData,
} from "@/lib/offline/device-policy"
import { isInstalledPwa } from "@/lib/offline/storage-status"

/** `window.matchMedia` que solo responde `true` al `display-mode` dado. */
function emulateDisplayMode(displayMode: string | null) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: displayMode != null && query === `(display-mode: ${displayMode})` }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  mode.value = "read"
})

describe("app instalada = equipo personal (D-12)", () => {
  it.each(["standalone", "fullscreen", "minimal-ui"])("detecta la app instalada en display-mode %s", (dm) => {
    emulateDisplayMode(dm)
    expect(isInstalledPwa()).toBe(true)
  })

  it("en la pestaña del navegador no es la app instalada", () => {
    emulateDisplayMode("browser")
    expect(isInstalledPwa()).toBe(false)
    expect(isInstalledPersonalDevice()).toBe(false)
    expect(canUsePersonalDevice("a@x.co")).toBe(false)
    expect(logoutKeepsDeviceData("personal")).toBe(false)
  })

  it("instalada: personal sin exigir el piloto y el logout conserva los datos", () => {
    emulateDisplayMode("standalone")
    expect(isInstalledPersonalDevice()).toBe(true)
    expect(canUsePersonalDevice("fuera-del-piloto@x.co")).toBe(true)
    expect(isPersonalDeviceAllowed({ email: "fuera-del-piloto@x.co", roles: [] })).toBe(true)
    expect(logoutKeepsDeviceData("personal")).toBe(true)
    // Un equipo que igual quedó compartido (p. ej. por el kill-switch) no conserva nada.
    expect(logoutKeepsDeviceData("compartido")).toBe(false)
  })

  it("el kill-switch `off` devuelve la app instalada a las reglas del navegador", () => {
    emulateDisplayMode("standalone")
    mode.value = "off"
    expect(isInstalledPersonalDevice()).toBe(false)
    expect(canUsePersonalDevice("a@x.co")).toBe(false)
    expect(logoutKeepsDeviceData("personal")).toBe(false)
  })
})
