import { expect, it } from "vitest"

import { REMISION_VACIA, esquemaRemision, remisionAlBackend } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/remision-form"

it("exige motivo y 10 caracteres de descripción", () => {
  expect(esquemaRemision.safeParse({ ...REMISION_VACIA, motivo: "1", descripcion: "corta" }).success).toBe(false)
  expect(esquemaRemision.safeParse({ ...REMISION_VACIA, motivo: "1", descripcion: "suficientemente larga" }).success).toBe(true)
})

it("las secciones vacías van en null", () => {
  const b = remisionAlBackend({ ...REMISION_VACIA, motivo: "2", descripcion: " texto largo ", relaciones: " x " }, 9)
  expect(b).toMatchObject({ FK_MATRICULA: 9, FK_MOTIVO: 2, DESCRIPCION: "texto largo", RELACIONES: "x", SEGUIMIENTO: null })
})
