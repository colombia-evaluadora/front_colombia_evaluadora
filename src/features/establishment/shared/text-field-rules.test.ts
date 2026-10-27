import { describe, expect, it } from "vitest"

import {
  toDireccionInput,
  toTextoInput,
  validarDireccion,
  validarIdentificacionAdministrativa,
  validarLugar,
  validarNombreEstablecimiento,
  validarUbicacion,
} from "@/features/establishment/shared/text-field-rules"

// Ejemplos del caso de prueba E04HU02 (Mantis 0000694).
describe("validarNombreEstablecimiento", () => {
  it.each(["Institución Educativa San José", "I.E. Nº 5 (Sede A)", "Colegio O'Higgins", "Liceo Santa Fe & Cía"])(
    "acepta %s",
    (valor) => expect(validarNombreEstablecimiento(valor)).toBeNull(),
  )

  it.each(["++++<<<<", "\"\"\"\"", "ççççç----", "Wahucio'''''''---- ----.ccccc", "12345", "'-.'", "----"])(
    "rechaza %s",
    (valor) => expect(validarNombreEstablecimiento(valor)).not.toBeNull(),
  )

  it("en blanco no es asunto suyo (lo decide el obligatorio)", () => {
    expect(validarNombreEstablecimiento("   ")).toBeNull()
  })
})

describe("toTextoInput", () => {
  it("convierte el acento agudo en apóstrofo y no deja solo espacios", () => {
    expect(toTextoInput("O´Higgins")).toBe("O'Higgins")
    expect(toTextoInput("     ")).toBe("")
  })
})

describe("validarLugar", () => {
  it.each(["El Prado", "Comuna 5", "5", "Localidad de Suba", "20 de Julio", "Sector 12A", "Usaquén", "Barrio O'Higgins"])("acepta %s", (valor) =>
    expect(validarLugar(valor, "El barrio")).toBeNull(),
  )

  it.each(["cccccccccccc----", "99998uuu+cç", "-+-+-", "...", "99998uuucç", "ç çç/f", "Comuna 99999", "aaa", "Ghhggh", "Bbb 5"])("rechaza %s", (valor) =>
    expect(validarLugar(valor, "El barrio")).not.toBeNull(),
  )
})

describe("validarDireccion", () => {
  it.each(["CR 5 # 26D-7A", "CL 10 # 15-20", "Mz A L 27", "Km 5 vía al mar", "Calle 45BIS # 12-30", "Vereda El Rosal", "KR 7 # 45-12 Apto 301", "CL 100 # 15-20 Torre III"])(
    "acepta %s",
    (valor) => expect(validarDireccion(valor)).toBeNull(),
  )

  it.each(["`6767676ghhggh+++```", "6767676ghhggh", "12345", "## --", "Calle", "CL CL", "6767676 ghhggh", "Calle 1234567", "aaa 1"])("rechaza %s", (valor) =>
    expect(validarDireccion(valor)).not.toBeNull(),
  )

  it("el input no deja empezar con espacios ni repetirlos", () => {
    expect(toDireccionInput("   ")).toBe("")
    expect(toDireccionInput(" CL  10")).toBe("CL 10")
  })

  it("el input descarta comillas invertidas y signos de más", () => {
    expect(toDireccionInput("`6767676ghhggh+++```")).toBe("6767676ghhggh")
  })
})

describe("validarIdentificacionAdministrativa", () => {
  it.each(["Resolución 1234 de 2010", "0045/2019", "No. 12-A", "Res. 004 (2015)"])("acepta %s", (valor) =>
    expect(validarIdentificacionAdministrativa(valor, "La resolución")).toBeNull(),
  )

  it.each(["ç'ç'+'+'(/)<<", "9998877/('+'+ç'ç'ç'<<<", "abc", "--12", "12//34"])("rechaza %s", (valor) =>
    expect(validarIdentificacionAdministrativa(valor, "La resolución")).not.toBeNull(),
  )
})

describe("validarUbicacion", () => {
  it.each(["4.7110, -74.0721", "4.711,-74.0721", "-0.5, 179.9", "10, -75"])("acepta %s", (valor) =>
    expect(validarUbicacion(valor)).toBeNull(),
  )

  it.each(["4.7110", "abc", "91, 10", "4.7, -181", "4.7, -74, 3"])("rechaza %s", (valor) =>
    expect(validarUbicacion(valor)).not.toBeNull(),
  )
})
