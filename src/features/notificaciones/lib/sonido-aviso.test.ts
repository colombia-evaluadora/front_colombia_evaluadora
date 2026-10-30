import { beforeEach, describe, expect, it } from "vitest"

import { debeSonar, reiniciarSonidoAviso, reproducirSonidoAviso } from "@/features/notificaciones/lib/sonido-aviso"

describe("sonido de avisos", () => {
  beforeEach(() => reiniciarSonidoAviso())

  it("suena solo si el evento lo pide y el usuario no lo apagó", () => {
    expect(debeSonar({ sonar: true }, true)).toBe(true)
    expect(debeSonar({ sonar: true }, false)).toBe(false)
    expect(debeSonar({ sonar: false }, true)).toBe(false)
    expect(debeSonar({}, true)).toBe(false)
    expect(debeSonar(null, true)).toBe(false)
  })

  it("no suena para una conversación archivada", () => {
    const archivadas = new Set([12])
    expect(debeSonar({ sonar: true, deep_link: "/app/comunicaciones/chat?canal=12&mensaje=3" }, true, archivadas)).toBe(false)
    expect(debeSonar({ sonar: true, deep_link: "/app/comunicaciones/chat?canal=7&mensaje=3" }, true, archivadas)).toBe(true)
    expect(debeSonar({ sonar: true, deep_link: "/app/planeador" }, true, archivadas)).toBe(true)
  })

  it("no repite el sonido en una ráfaga", () => {
    expect(reproducirSonidoAviso(10_000)).toBe(true)
    expect(reproducirSonidoAviso(10_500)).toBe(false)
    expect(reproducirSonidoAviso(12_000)).toBe(true)
  })
})
