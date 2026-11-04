import { expect, it } from "vitest"

import { acumularGestores } from "@/features/gestion-estudiantil/convivencia/utils/gestores"

it("acumula gestores sin repetir y salta las filas sin gestor", () => {
  const prev = [{ value: "1", label: "Ana" }]
  const filas = [
    { fk_tfuncionario_gestor: 1, gestor_nombre: "Ana" },
    { fk_tfuncionario_gestor: 2, gestor_nombre: "Luis" },
    { fk_tfuncionario_gestor: null, gestor_nombre: null },
  ]
  expect(acumularGestores(prev, filas as never)).toEqual([
    { value: "1", label: "Ana" },
    { value: "2", label: "Luis" },
  ])
})
