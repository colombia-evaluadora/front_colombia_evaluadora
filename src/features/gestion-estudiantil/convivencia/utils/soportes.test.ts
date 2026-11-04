import { expect, it } from "vitest"

import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { errorMotivoSoporte, formatPeso, partirSoportes, puedeAgregarSoporte } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

it("partirSoportes separa vigentes y anteriores", () => {
  const r = partirSoportes([{ id: 1, vigente: true }, { id: 2, vigente: false }] as SoporteAccion[])
  expect([r.vigentes.map((s) => s.id), r.anteriores.map((s) => s.id)]).toEqual([[1], [2]])
  expect(partirSoportes(undefined)).toEqual({ vigentes: [], anteriores: [] })
})

it("puedeAgregarSoporte: máximo 5 y caso abierto", () => {
  expect(puedeAgregarSoporte(4, false)).toBe(true)
  expect(puedeAgregarSoporte(5, false)).toBe(false)
  expect(puedeAgregarSoporte(0, true)).toBe(false)
})

it("errorMotivoSoporte: 10 a 500", () => {
  expect(errorMotivoSoporte("corto")).toBeDefined()
  expect(errorMotivoSoporte("motivo suficiente")).toBeUndefined()
  expect(errorMotivoSoporte("x".repeat(501))).toBeDefined()
})

it("formatPeso", () => {
  expect([formatPeso(null), formatPeso(512), formatPeso(1536), formatPeso(2 * 1024 * 1024)]).toEqual(["", "512 B", "1,5 KB", "2,0 MB"])
})
