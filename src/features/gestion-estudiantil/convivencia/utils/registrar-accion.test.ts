import { describe, expect, it } from "vitest"

import {
  codigosSiuceBody,
  erroresAccion,
  type ValoresAccion,
} from "@/features/gestion-estudiantil/convivencia/utils/registrar-accion"

const AHORA = { fecha: "2026-03-10", hora: "10:00" }
const base: ValoresAccion = {
  accion: "1",
  fechaHora: { fecha: "2026-03-10", hora: "09:00" },
  descripcion: "Descripción válida",
  entidad: "",
  resultado: "",
  codigos: [],
}
const reglas = { conEntidad: false, esSeguimiento: false, esSiuce: false }
const errores = (v: Partial<ValoresAccion>, r: Partial<typeof reglas> = {}) =>
  erroresAccion({ ...base, ...v }, { ...reglas, ...r }, AHORA)

describe("erroresAccion", () => {
  it("una acción completa no tiene errores", () => {
    expect(Object.values(errores({})).some(Boolean)).toBe(false)
  })

  it("la fecha y hora no superan el momento actual", () => {
    expect(errores({ fechaHora: { fecha: "2026-03-10", hora: "10:01" } }).fecha).toMatch(/posteriores/)
    expect(errores({ fechaHora: { fecha: "", hora: "10:00" } }).fecha).toBe("La fecha y la hora son obligatorias.")
  })

  it("entidad y resultado según la acción", () => {
    expect(errores({}, { conEntidad: true }).entidad).toBeDefined()
    expect(errores({}, { esSeguimiento: true }).resultado).toBeDefined()
  })

  it("códigos SIUCE: al menos uno, completos y sin afectados repetidos", () => {
    expect(errores({}, { esSiuce: true }).codigos).toMatch(/al menos un afectado/)
    expect(errores({ codigos: [{ afectado: "m:1", codigo: " " }] }, { esSiuce: true }).codigos).toMatch(/1 a 50/)
    const rep = [
      { afectado: "m:1", codigo: "A" },
      { afectado: "m:1", codigo: "B" },
    ]
    expect(errores({ codigos: rep }, { esSiuce: true }).codigos).toBe("Un afectado no se repite.")
  })
})

describe("codigosSiuceBody", () => {
  it("separa matrícula y funcionario", () => {
    expect(
      codigosSiuceBody([
        { afectado: "m:7", codigo: " X1 " },
        { afectado: "f:3", codigo: "Y" },
      ]),
    ).toEqual([
      { fk_matricula: 7, fk_funcionario: null, codigo: "X1" },
      { fk_matricula: null, fk_funcionario: 3, codigo: "Y" },
    ])
  })
})
