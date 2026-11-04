import { expect, it } from "vitest"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { codigosReportados, etiquetaPasoCierre, nombreAfectado, siNoTexto } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

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
