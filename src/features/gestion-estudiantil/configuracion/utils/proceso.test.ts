import { describe, expect, it } from "vitest"

import {
  errorBackendACampo,
  validarClasificacion,
  validarPlazos,
  validarSancion,
  type ValoresSancion,
} from "@/features/gestion-estudiantil/configuracion/utils/proceso"

const sancion: ValoresSancion = {
  nombre: "Amonestación escrita",
  descripcion: "",
  estado: "activo",
  instancia: "1",
  duracion: false,
  efecto: "2",
}

describe("validarPlazos", () => {
  it("entre 1 y 15", () => {
    expect(validarPlazos({ descargos: "3", recursos: "5" })).toEqual({})
    expect(validarPlazos({ descargos: "0", recursos: "16" })).toEqual({
      descargos: "Días hábiles para presentar descargos debe ser un número entero entre 1 y 15.",
      recursos: "Días hábiles para interponer recursos debe ser un número entero entre 1 y 15.",
    })
  })
})

describe("validarClasificacion", () => {
  it("nombre de 3 a 60", () => {
    expect(validarClasificacion({ nombre: "Le", descripcion: "", estado: "activo" }).nombre).toMatch(/entre 3 y 60/)
    expect(validarClasificacion({ nombre: "Leve", descripcion: "", estado: "activo" })).toEqual({})
  })
})

describe("validarSancion", () => {
  it("instancia y efecto obligatorios", () => {
    const e = validarSancion({ ...sancion, instancia: "", efecto: "" }, false)
    expect(e.instancia).toBeDefined()
    expect(e.efecto).toBeDefined()
  })
  it("el efecto que exige duración", () => {
    expect(validarSancion(sancion, true).duracion).toMatch(/exigen Tiene duración/)
    expect(validarSancion({ ...sancion, duracion: true }, true)).toEqual({})
  })
})

describe("errorBackendACampo", () => {
  const err = (message: string) => ({ isAxiosError: true, response: { status: 409, data: { message } } })
  it("duplicado va al nombre", () => {
    expect(errorBackendACampo(err("La sanción X ya existe en el catálogo del establecimiento."))?.campo).toBe("nombre")
  })
  it("sector va al efecto", () => {
    expect(
      errorBackendACampo(err("No renovación del cupo y Cancelación de la matrícula solo aplican en un establecimiento del sector No oficial"))
        ?.campo,
    ).toBe("efecto")
  })
  it("permisos no es de un campo", () => {
    expect(errorBackendACampo(err("No tiene permiso para modificar"))).toBeNull()
  })
})
