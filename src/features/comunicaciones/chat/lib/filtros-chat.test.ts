import { describe, expect, it } from "vitest"

import { chatSearchSchema } from "@/features/comunicaciones/chat/api/schema"
import {
  FILTROS_VACIOS,
  contarFiltrosAvanzados,
  cuerpoBusqueda,
  describirFiltros,
  filtrosAUrl,
  filtrosDeUrl,
  hayFiltros,
  hayFiltrosDeAutor,
  resaltarPalabras,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

describe("filtros del chat", () => {
  it("sin filtros (o con textos cortos) no busca", () => {
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false)
    expect(hayFiltros({ ...FILTROS_VACIOS, q: "ab", persona: " a " })).toBe(false)
    expect(hayFiltros({ ...FILTROS_VACIOS, tipos: ["GRUPO"] })).toBe(true)
    expect(hayFiltros({ ...FILTROS_VACIOS, desde: "2026-03-01" })).toBe(true)
    expect(hayFiltrosDeAutor({ ...FILTROS_VACIOS, grupos: [601] })).toBe(true)
  })

  it("arma el cuerpo UPPER_SNAKE sin claves vacías y corrige un rango al revés", () => {
    expect(
      cuerpoBusqueda(
        {
          ...FILTROS_VACIOS,
          q: "  evaluación ",
          tipos: ["GRUPO", "GRUPO", "DIRECTO"],
          desde: "2026-03-10",
          hasta: "2026-03-01",
          estados: ["NO_LEIDO"],
          grupos: [802, 601],
        },
        55,
      ),
    ).toEqual({
      Q: "evaluación",
      TIPOS: ["DIRECTO", "GRUPO"],
      DESDE: "2026-03-01",
      HASTA: "2026-03-10",
      ESTADOS: ["NO_LEIDO"],
      GRUPOS: [601, 802],
      ANTES: 55,
    })
    expect(cuerpoBusqueda({ ...FILTROS_VACIOS, desde: "ayer" })).toEqual({})
  })

  it("cuenta y describe los filtros del panel", () => {
    const f = { ...FILTROS_VACIOS, q: "tarea", tipos: ["GRUPO" as const], perfiles: ["DOCENTE" as const], grupos: [601], desde: "2026-03-05", hasta: "2026-03-05" }
    expect(contarFiltrosAvanzados(f)).toBe(4)
    expect(describirFiltros(f, (id) => (id === 601 ? "Sexto 601" : undefined))).toBe(
      "Grupal · Docentes · Sexto 601 · 5/3/2026",
    )
  })

  it("ida y vuelta por la URL; valores inválidos no rompen", () => {
    const f = { ...FILTROS_VACIOS, persona: "Ana", estados: ["EDITADO" as const] }
    expect(filtrosDeUrl(filtrosAUrl(f))).toEqual(f)
    const s = chatSearchSchema.parse({ tipos: ["OTRO"], desde: "mañana", grupos: [601], estados: ["LEIDO"] })
    expect(s.tipos).toBeUndefined()
    expect(s.desde).toBeUndefined()
    expect(s.grupos).toEqual([601])
    expect(s.estados).toEqual(["LEIDO"])
  })

  it("resalta cada palabra sin tildes ni mayúsculas", () => {
    expect(resaltarPalabras("La Evaluación es el viernes", "evaluacion VIERNES")).toEqual([
      { texto: "La ", coincide: false },
      { texto: "Evaluación", coincide: true },
      { texto: " es el ", coincide: false },
      { texto: "viernes", coincide: true },
    ])
    expect(resaltarPalabras("hola", "")).toEqual([{ texto: "hola", coincide: false }])
  })
})
