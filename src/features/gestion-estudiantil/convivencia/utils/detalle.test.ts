import { expect, it } from "vitest"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { codigosReportados, etiquetaPasoCierre, nombreAfectado, subtextoPaso, siNoTexto } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

it("siNoTexto", () => {
  expect([siNoTexto(true), siNoTexto(false), siNoTexto(null), siNoTexto(undefined)]).toEqual(["Sí", "No", "", ""])
})

it("nombreAfectado busca por matrícula o por funcionario", () => {
  const caso = {
    estudiantes: [{ fk_matricula: 7, nombre: "Ana" }],
    otros_involucrados: [{ fk_funcionario: 3, nombre: "Eva" }],
  } as unknown as CasoDetalle
  expect(nombreAfectado(caso, { fk_matricula: 7, fk_funcionario: null })).toBe("Ana")
  expect(nombreAfectado(caso, { fk_matricula: null, fk_funcionario: 3 })).toBe("Eva")
  expect(nombreAfectado(caso, { fk_matricula: 99, fk_funcionario: null })).toBeUndefined()
})

it("codigosReportados lista cada código con su afectado", () => {
  const caso = {
    estudiantes: [{ fk_matricula: 7, nombre: "Ana" }],
    acciones: [
      { accion_codigo: "REPORTE_SIUCE", codigos_siuce: [{ fk_matricula: 7, fk_funcionario: null, codigo: "C1" }, { fk_matricula: 9, fk_funcionario: null, codigo: "C2", afectado_nombre: "Luis" }] },
      { accion_codigo: "SEGUIMIENTO", codigos_siuce: [] },
    ],
  } as unknown as CasoDetalle
  expect(codigosReportados(caso, "REPORTE_SIUCE")).toEqual(["Código C1 · Ana (Afectado)", "Código C2 · Luis (Afectado)"])
})

it("etiquetaPasoCierre", () => {
  expect(etiquetaPasoCierre(true)).toBe("Paso de cierre · después de la sesión del Comité")
  expect(etiquetaPasoCierre(false)).toBe("de cierre")
})

it("subtextoPaso une fecha, detalle y descripción omitiendo lo vacío", () => {
  const ultima = { fecha_hora: "2026-11-19T10:00:00", descripcion: "Reunion con las partes" }
  const base = { registrado: true, no_aplica: false }
  expect(subtextoPaso({ ...base, fecha_hora: "2026-11-19T10:00:00" }, ultima)).toBe("19/11/2026 · Reunion con las partes")
  expect(subtextoPaso({ ...base, fecha_hora: "2026-11-20T10:00:00", detalle: "Paso de cierre" }, ultima)).toBe(
    "20/11/2026 · Paso de cierre · Reunion con las partes",
  )
  expect(subtextoPaso({ registrado: false, no_aplica: false, detalle: "citación a cada acudiente" })).toBe("citación a cada acudiente")
  expect(subtextoPaso({ registrado: false, no_aplica: false })).toBe("")
})
