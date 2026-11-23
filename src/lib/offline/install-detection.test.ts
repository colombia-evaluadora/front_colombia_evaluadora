import { afterEach, describe, expect, it, vi } from "vitest"

import { isInstalledPwa } from "@/lib/offline/install-detection"

function emular({ displayMode, standalone }: { displayMode?: string; standalone?: boolean }) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: displayMode != null && query === `(display-mode: ${displayMode})` }),
  })
  vi.stubGlobal("navigator", { standalone })
}

afterEach(() => vi.unstubAllGlobals())

describe("isInstalledPwa: app instalada = equipo personal, pestaña = compartido", () => {
  it.each(["standalone", "fullscreen", "minimal-ui"])("display-mode %s es la app instalada", (dm) => {
    emular({ displayMode: dm })
    expect(isInstalledPwa()).toBe(true)
  })

  it("Safari iOS desde la pantalla de inicio (navigator.standalone)", () => {
    emular({ displayMode: "browser", standalone: true })
    expect(isInstalledPwa()).toBe(true)
  })

  it("la pestaña del navegador no es la app instalada", () => {
    emular({ displayMode: "browser" })
    expect(isInstalledPwa()).toBe(false)
  })

  it("sin window (SSR/tests node) no es la app instalada", () => {
    expect(isInstalledPwa()).toBe(false)
  })
})
