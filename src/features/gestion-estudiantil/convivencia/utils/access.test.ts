import { describe, expect, it } from "vitest"

import { accesoConvivencia } from "@/features/gestion-estudiantil/convivencia/utils/access"

const TODO = { puedeVer: true, puedeCrear: true, puedeEditar: true }

describe("accesoConvivencia", () => {
  it("psico-orientador escribe casos y ve el Comité, pero no supervisa ni lo gestiona", () => {
    const a = accesoConvivencia(["CEVAL-PSICO_ORIENTADOR"], TODO)
    expect(a).toMatchObject({ puedeGestionar: true, puedeVerComite: true, puedeSupervisar: false, puedeGestionarComite: false })
  })
  it("coordinador y rector supervisan, gestionan el Comité y exportan el SIUCE", () => {
    for (const r of ["CEVAL-COORDINADOR", "CEVAL-RECTOR"])
      expect(accesoConvivencia([r], TODO)).toMatchObject({ puedeSupervisar: true, puedeGestionarComite: true, puedeExportarSiuce: true })
  })
  it("trabajador social solo ve el Comité", () => {
    const a = accesoConvivencia(["CEVAL-TRABAJADOR_SOCIAL"], TODO)
    expect(a).toMatchObject({ puedeVerComite: true, puedeGestionar: false, puedeExportarSiuce: false })
  })
  it("el jefe de sistema ya no entra y el docente no ve el Comité", () => {
    expect(accesoConvivencia(["CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"], TODO)).toMatchObject({ puedeCrear: false, puedeVerComite: false })
    expect(accesoConvivencia(["CEVAL-DOCENTE"], TODO)).toMatchObject({ puedeGestionar: true, puedeVerComite: false })
  })
  it("sin permiso de menú no hay nada", () => {
    expect(accesoConvivencia(["CEVAL-RECTOR"], { puedeVer: false, puedeCrear: false, puedeEditar: false }).puedeVerComite).toBe(false)
  })
})
