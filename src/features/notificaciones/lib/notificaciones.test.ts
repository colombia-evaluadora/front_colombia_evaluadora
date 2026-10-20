import { describe, expect, it } from "vitest"

import { preferenciasFormSchema } from "@/features/notificaciones/api/schema"
import { notificacionesSearchSchema } from "@/features/notificaciones/api/schema"
import { toNotificacion } from "@/features/notificaciones/api/query/use-notificaciones-query"
import { toPreferenciasPayload } from "@/features/notificaciones/api/mutations/update-preferencias"
import { agruparPorDia, etiquetaDia } from "@/features/notificaciones/lib/agrupar-por-dia"
import { DEEP_LINK_FALLBACK, formatActores, formatContador, safeDeepLink } from "@/features/notificaciones/lib/deep-link"

describe("safeDeepLink", () => {
  it("acepta rutas internas /app/ con query", () => {
    expect(safeDeepLink("/app/planeador/actividades?actividad=12")).toBe("/app/planeador/actividades?actividad=12")
  })

  it.each([
    null,
    "",
    "https://example.com/app/x",
    "//evil.com/app/x",
    "/app",
    "/login",
    "javascript:alert(1)",
    "/app/../login",
    "/app\\..\\login",
  ])("rechaza %s y cae a la bandeja", (link) => {
    expect(safeDeepLink(link)).toBe(DEEP_LINK_FALLBACK)
  })
})

describe("formatContador / formatActores", () => {
  it("topa el contador en 9+", () => {
    expect(formatContador(0)).toBe("0")
    expect(formatContador(9)).toBe("9")
    expect(formatContador(10)).toBe("9+")
  })

  it("resume actores agrupados", () => {
    expect(formatActores([], 0)).toBeNull()
    expect(formatActores(["Ana"], 1)).toBe("Ana")
    expect(formatActores(["Ana", "Luis"], 5)).toBe("Ana y 4 más")
  })
})

describe("agruparPorDia", () => {
  it("agrupa por día local sin reordenar y etiqueta Hoy/Ayer", () => {
    const hoy = new Date(2026, 9, 15, 12, 0)
    const items = [
      { id: "a", creadaEn: new Date(2026, 9, 15, 11, 0).toISOString() },
      { id: "b", creadaEn: new Date(2026, 9, 15, 8, 0).toISOString() },
      { id: "c", creadaEn: new Date(2026, 9, 14, 20, 0).toISOString() },
      { id: "d", creadaEn: new Date(2026, 9, 10, 9, 0).toISOString() },
    ]
    const grupos = agruparPorDia(items, hoy)
    expect(grupos.map((g) => g.etiqueta)).toEqual(["Hoy", "Ayer", etiquetaDia(new Date(2026, 9, 10), hoy)])
    expect(grupos[0].items.map((i) => i.id)).toEqual(["a", "b"])
    expect(grupos[2].etiqueta).toMatch(/^Sábado, 10 de octubre$/)
  })
})

describe("toNotificacion", () => {
  it("mapea la fila snake_case y sanea el deep link", () => {
    const n = toNotificacion({
      id: "1",
      tipo: "SISTEMA_MANTENIMIENTO",
      categoria: "SISTEMA",
      titulo: "Mantenimiento",
      cuerpo_corto: null,
      deep_link: "https://example.com",
      prioridad: "URGENTE_INSTITUCIONAL",
      creada_en: "2026-10-15T10:00:00.000Z",
      leida_en: null,
      actores: null,
      conteo: null,
    })
    expect(n).toMatchObject({ cuerpo: "", deepLink: DEEP_LINK_FALLBACK, leida: false, actores: [], conteo: 1 })
  })
})

describe("schemas", () => {
  it("ignora filtros desconocidos en la URL", () => {
    expect(notificacionesSearchSchema.parse({ categoria: "NOPE", estado: "no-leidas" })).toEqual({
      categoria: undefined,
      estado: "no-leidas",
      texto: undefined,
    })
  })

  const base = {
    tipos: [{ tipo: "CHAT_MENCION", push: true, email: false }],
    horarioSilencioso: { activo: true, desde: "22:00", hasta: "06:00", dias: [3, 1] },
  }

  it("acepta un horario que cruza la medianoche y rechaza desde == hasta o sin días", () => {
    expect(preferenciasFormSchema.safeParse(base).success).toBe(true)
    const igual = { ...base, horarioSilencioso: { ...base.horarioSilencioso, hasta: "22:00" } }
    expect(preferenciasFormSchema.safeParse(igual).success).toBe(false)
    const sinDias = { ...base, horarioSilencioso: { ...base.horarioSilencioso, dias: [] } }
    expect(preferenciasFormSchema.safeParse(sinDias).success).toBe(false)
    const apagado = { ...base, horarioSilencioso: { activo: false, desde: "", hasta: "", dias: [] } }
    expect(preferenciasFormSchema.safeParse(apagado).success).toBe(true)
  })

  it("arma el PUT sin in_app y con días ordenados", () => {
    expect(toPreferenciasPayload(base)).toEqual({
      tipos: [{ tipo: "CHAT_MENCION", push: true, email: false }],
      horario_silencioso: { activo: true, desde: "22:00", hasta: "06:00", dias: [1, 3] },
    })
  })
})
