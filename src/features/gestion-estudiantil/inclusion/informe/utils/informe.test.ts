import { expect, it } from "vitest"

import { porAsignatura } from "@/features/gestion-estudiantil/inclusion/informe/utils/informe"

it("suma la cobertura de una asignatura entre grados", () => {
  const f = { fk_tasignatura: 1, asignatura_nombre: "A", con_ajustes: 1, sin_ajustes: 2, pendiente_revision: 0 }
  expect(porAsignatura([f, { ...f, con_ajustes: 3 }])).toEqual([{ ...f, con_ajustes: 4, sin_ajustes: 4 }])
})
