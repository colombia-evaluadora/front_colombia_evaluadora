import { describe, expect, it } from "vitest"

import { toBloqueoZona } from "@/features/establishment/institution/utils/bloqueo-zona"

describe("toBloqueoZona", () => {
  it("convierte el rechazo de la zona (Regla 21) en el bloqueo con las sedes en lista", () => {
    const bloqueo = toBloqueoZona(
      "Estas sedes tienen una zona que Urbana no permite: SEDE VEREDA (Rural), SEDE LA PAZ, ANEXA (Rural). Cambie su zona antes de cambiar la del establecimiento.",
    )
    expect(bloqueo?.titulo).toBe("No se puede cambiar la zona")
    expect(bloqueo?.items).toEqual(["SEDE VEREDA (Rural)", "SEDE LA PAZ, ANEXA (Rural)"])
  })

  it("otro error no es un bloqueo de zona", () => {
    expect(toBloqueoZona("Ya existe otro establecimiento activo con el NIT 900123456.")).toBeNull()
    expect(toBloqueoZona(undefined)).toBeNull()
  })
})
