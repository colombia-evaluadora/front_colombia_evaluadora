import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { conservacionDatosHandlers } from "@/mocks/handlers/conservacion-datos"
import { vencidosDb } from "@/mocks/db/conservacion-datos"

const server = setupServer(...conservacionDatosHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const URL_BASE = "http://localhost/api/eval-col/conservacion-datos"
const json = (method: string, path: string, body?: unknown) =>
  fetch(`${URL_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

describe("mock de Conservación de datos", () => {
  it("rechaza un tipo de registro repetido con 409", async () => {
    const r = await json("POST", "/politicas", {
      TIPO_REGISTRO: "observador",
      PK_MODULO: 6,
      PERMANENTE: true,
    })
    expect(r.status).toBe(409)
  })

  it("no deja una ampliación por debajo del mínimo", async () => {
    const r = await json("POST", "/ampliaciones", { PK_POLITICA: 3, PLAZO: 1 })
    expect(r.status).toBe(400)
    expect((await r.json()).message).toBe("El plazo del establecimiento no puede ser menor que el plazo mínimo.")
  })

  it("Disponer aplica la disposición de la política: Archivar sin almacenamiento falla, Anonimizar vacía el lote", async () => {
    const form = (pkPolitica: number) => {
      const lote = vencidosDb.find((v) => v.pkPolitica === pkPolitica)
      const f = new FormData()
      f.set("PK_POLITICA", String(pkPolitica))
      f.set("PK_ESTABLECIMIENTO", String(lote?.pkEstablecimiento))
      f.set("MOTIVO", "Registros que cumplieron su plazo.")
      f.set("ACTA", new File(["%PDF"], "acta.pdf", { type: "application/pdf" }))
      return f
    }
    const url = "http://localhost/api/files/eval-col/conservacion-datos/vencidos/disponer"
    expect((await fetch(url, { method: "POST", body: form(3) })).status).toBe(400)
    expect(vencidosDb.some((v) => v.pkPolitica === 3)).toBe(true)
    const ok = await fetch(url, { method: "POST", body: form(1) })
    expect(ok.status).toBe(200)
    expect((await ok.json()).rows[0].resultado.disposicion).toBe("ANONIMIZAR")
    expect(vencidosDb.some((v) => v.pkPolitica === 1)).toBe(false)
  })

  it("la descarga trae una huella que coincide con el archivo", async () => {
    const r = await json("POST", "/archivo/1/descarga")
    const { ubicacion, huella } = (await r.json()).rows[0].resultado
    const texto = decodeURIComponent(ubicacion.split(",")[1])
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))
    const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
    expect(hex).toBe(huella)
  })
})
