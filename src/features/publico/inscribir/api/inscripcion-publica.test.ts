// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import {
  motivosAnulacionDe,
  toCatalogosFijos,
  toDepartamentos,
  toRegistroParams,
} from "@/features/publico/inscribir/api/inscripcion-publica"
import { createInitialMatriculaValues } from "@/features/coverage/matricula/utils/matricula-form-defaults"

describe("inscripción pública: contrato con el backend", () => {
  it("convierte las listas por categoría en los catálogos fijos de matrícula", () => {
    const fijos = toCatalogosFijos({
      listas: {
        TIPO_DOCUMENTO: [{ id: 7, nombre: "Registro civil" }],
        MOTIVO_ANULACION_INSCRIPCION: [{ id: 3, nombre: "La familia desiste" }],
      },
      etnias: [{ id: 1, code: "NA", name: "No aplica" }],
    })
    expect(fijos.tipoDocumento).toEqual([{ id: 7, nombre: "Registro civil" }])
    expect(fijos.genero).toEqual([])
    expect(fijos.etnias).toHaveLength(1)
    expect(fijos.discapacidades).toEqual([])
    expect(motivosAnulacionDe({ listas: { MOTIVO_ANULACION_INSCRIPCION: [{ id: 3, nombre: "La familia desiste" }] } })).toHaveLength(1)
    expect(toCatalogosFijos(undefined).tipoDocumento).toEqual([])
  })

  it("agrupa los municipios por departamento", () => {
    expect(
      toDepartamentos([
        { id: 1, nombre: "Bucaramanga", departamento: "Santander" },
        { id: 2, nombre: "Girón", departamento: "Santander" },
        { id: 3, nombre: "Soacha", departamento: "Cundinamarca" },
      ]),
    ).toEqual([
      { name: "Santander", municipalities: [{ id: 1, name: "Bucaramanga" }, { id: 2, name: "Girón" }] },
      { name: "Cundinamarca", municipalities: [{ id: 3, name: "Soacha" }] },
    ])
    expect(toDepartamentos(undefined)).toEqual([])
  })

  it("arma los binds del registro: JSONB como texto y opcionales vacíos fuera", () => {
    const v = createInitialMatriculaValues()
    v.student = { ...v.student, documentType: "7", documentNumber: " 1098 ", firstName: "Ana", lastName: "Ruiz", gender: "2", birthDate: "2016-03-01" }
    v.guardian = { ...v.guardian, relationship: "5", documentType: "8", documentNumber: "52111222", firstName: "Rosa", lastName: "Ruiz", gender: "2" }
    v.guardianContact = { ...v.guardianContact, phone: "3001112233", email: "Rosa@Correo.com" }
    const p = toRegistroParams({
      datos: v,
      correo: " Rosa@Correo.com ",
      codigo: "123456",
      opciones: [{ periodo: 10, grado: 20 }],
      documentoHermano: null,
      paisOrigen: "Colombia",
      lenguaMaterna: null,
      condicionMigratoria: null,
      autorizaDatos: false,
    })
    expect(p["BODY.CORREO"]).toBe("rosa@correo.com")
    expect(p["BODY.FK_TLV_PARENTESCO"]).toBe(5)
    expect(JSON.parse(p["BODY.OPCIONES"] as string)).toEqual([{ periodo: 10, grado: 20 }])
    expect(JSON.parse(p["BODY.ASPIRANTE"] as string)).toMatchObject({ tipoDocumento: 7, documento: "1098", genero: 2, fechaNacimiento: "2016-03-01" })
    expect(JSON.parse(p["BODY.ACUDIENTE"] as string)).toMatchObject({ documento: "52111222", telefono: "3001112233" })
    expect(p["BODY.PAIS_ORIGEN"]).toBe("Colombia")
    expect(p).not.toHaveProperty(["BODY.DOCUMENTO_HERMANO"])
    expect(p).not.toHaveProperty(["BODY.LENGUA_MATERNA"])
    expect(p["BODY.AUTORIZA_DATOS"]).toBe(false)
  })
})
