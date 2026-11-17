import { describe, expect, it } from "vitest"

import { validarServicioSocial } from "@/features/gestion-estudiantil/configuracion/utils/servicio-social"

describe("validarServicioSocial", () => {
  it("valores predeterminados válidos", () => {
    expect(validarServicioSocial({ horas: "80", grados: [472, 473], anticipacion: "2" })).toEqual({})
  })
  it("rangos y al menos un grado", () => {
    const e = validarServicioSocial({ horas: "501", grados: [], anticipacion: "7" })
    expect(e.horas).toMatch(/entre 1 y 500/)
    expect(e.grados).toMatch(/al menos un grado/)
    expect(e.anticipacion).toMatch(/entre 1 y 6/)
  })
})
