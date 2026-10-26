import { describe, expect, it } from "vitest"

import { ATAJOS, consultaAtajo, filtrarAtajos, type IdAtajo } from "@/features/comunicaciones/chat/lib/atajos-composer"

const todos = new Set<IdAtajo>(ATAJOS.map((a) => a.id))

describe("atajos / del compositor", () => {
  it("solo es atajo un / al inicio y sin espacios", () => {
    expect(consultaAtajo("/")).toBe("")
    expect(consultaAtajo("/Enc")).toBe("enc")
    expect(consultaAtajo("/votación")).toBe("votacion")
    expect(consultaAtajo("/enc hola")).toBeNull()
    expect(consultaAtajo("a/b")).toBeNull()
    expect(consultaAtajo("")).toBeNull()
  })

  it("filtra por comando o palabra de la etiqueta, sin tildes", () => {
    expect(filtrarAtajos("", todos).map((a) => a.id)).toEqual([
      "encuesta",
      "votacion",
      "eleccion",
      "comunicado",
      "adjuntar",
      "programar",
    ])
    expect(filtrarAtajos("enc", todos).map((a) => a.id)).toEqual(["encuesta"])
    expect(filtrarAtajos("rap", todos).map((a) => a.id)).toEqual(["votacion"])
    expect(filtrarAtajos("elec", todos).map((a) => a.id)).toEqual(["eleccion"])
    expect(filtrarAtajos("zzz", todos)).toEqual([])
  })

  it("no ofrece lo que no está disponible (sin llamadas ni grabaciones)", () => {
    const soloComposer = new Set<IdAtajo>(["adjuntar", "programar"])
    expect(filtrarAtajos("", soloComposer).map((a) => a.id)).toEqual(["adjuntar", "programar"])
    expect(ATAJOS.some((a) => /video|llamad|grab|audio/i.test(`${a.etiqueta} ${a.comando}`))).toBe(false)
  })
})
