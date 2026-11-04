import { expect, it } from "vitest"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { nombreAfectado, siNoTexto } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

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
