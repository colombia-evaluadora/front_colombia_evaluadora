import { describe, expect, it } from "vitest"

import { buildCampusFormSchema, campusSpecialtySchema, hasRepeatedName } from "@/features/establishment/campuses/api/schema"

const valid = {
  establishmentId: 1,
  consecutive: "4",
  name: "Sede Norte",
  dane: "168001000634",
  zoneId: 11,
  neighborhood: "La Victoria",
  commune: "3",
  address: "Calle 5 # 2-10",
  phone: "6076457788",
  workScheduleIds: [1],
}

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]))

describe("buildCampusFormSchema", () => {
  const anexa = buildCampusFormSchema({ principal: false })

  it("acepta una sede anexa completa y sin opcionales", () => {
    expect(anexa.safeParse(valid).success).toBe(true)
    expect(anexa.safeParse({ ...valid, neighborhood: "", commune: "", address: "", phone: "" }).success).toBe(true)
  })

  it("exige establecimiento, zona y al menos una jornada", () => {
    const errors = messages(anexa.safeParse({ ...valid, establishmentId: null, zoneId: null, workScheduleIds: [] }))
    expect(errors.establishmentId).toMatch(/establecimiento/i)
    expect(errors.zoneId).toMatch(/zona/i)
    expect(errors.workScheduleIds).toBe("Seleccione al menos una jornada.")
  })

  it("el consecutivo va de 2 a 99: el 1 es de la principal", () => {
    expect(messages(anexa.safeParse({ ...valid, consecutive: "1" })).consecutive).toMatch(/entre 2 y 99/)
    expect(messages(anexa.safeParse({ ...valid, consecutive: "100" })).consecutive).toMatch(/entre 2 y 99/)
    expect(anexa.safeParse({ ...valid, consecutive: "99" }).success).toBe(true)
  })

  it("el código DANE antiguo tiene exactamente 12 dígitos", () => {
    expect(messages(anexa.safeParse({ ...valid, dane: "16800100063" })).dane).toMatch(/12 dígitos/)
    expect(messages(anexa.safeParse({ ...valid, dane: "1680010006345" })).dane).toMatch(/12 dígitos/)
  })

  it("rangos del informe: nombre 3-150, barrio 5-100, dirección 8-150 y teléfono de 7 a 15 dígitos", () => {
    expect(messages(anexa.safeParse({ ...valid, name: "AB" })).name).toBeDefined()
    expect(anexa.safeParse({ ...valid, name: `Sede ${"Norte ".repeat(24)}`.trim() }).success).toBe(true)
    expect(messages(anexa.safeParse({ ...valid, neighborhood: "Sur" })).neighborhood).toBeDefined()
    expect(messages(anexa.safeParse({ ...valid, address: "Cl 5 #2" })).address).toBeDefined()
    expect(messages(anexa.safeParse({ ...valid, phone: "12345" })).phone).toBeDefined()
    expect(anexa.safeParse({ ...valid, phone: "+573001234567" }).success).toBe(true)
  })

  it("al editar no revalida lo que no cambió (datos viejos se conservan)", () => {
    const original = { ...valid, dane: "30000004", phone: "+1 674 866" }
    const edicion = buildCampusFormSchema({ principal: false, original })
    expect(edicion.safeParse(original).success).toBe(true)
    expect(messages(edicion.safeParse({ ...original, dane: "30000005" })).dane).toMatch(/12 dígitos/)
  })

  it("en la principal no valida lo que viene del establecimiento", () => {
    const principal = buildCampusFormSchema({ principal: true })
    expect(principal.safeParse({ ...valid, consecutive: "1", name: "", dane: "123", neighborhood: "x" }).success).toBe(true)
    expect(messages(principal.safeParse({ ...valid, workScheduleIds: [] })).workScheduleIds).toBeDefined()
  })
})

describe("hasRepeatedName", () => {
  const sedes = [
    { id: 1, name: "IE Central" },
    { id: 2, name: "Sede  Norte" },
  ]

  it("compara sin mayúsculas ni espacios de más", () => {
    expect(hasRepeatedName(" sede norte ", sedes, null)).toBe(true)
    expect(hasRepeatedName("Sede Sur", sedes, null)).toBe(false)
  })

  it("no cuenta a la propia sede al editar", () => {
    expect(hasRepeatedName("Sede Norte", sedes, 2)).toBe(false)
  })
})

describe("campusSpecialtySchema", () => {
  const base = { characterId: 51854, specialtyId: 4, ownName: "", status: "A" as const, isOther: true }

  it("con Otra exige nombre propio de 3 a 100 caracteres", () => {
    expect(messages(campusSpecialtySchema.safeParse(base)).ownName).toMatch(/obligatorio/)
    expect(messages(campusSpecialtySchema.safeParse({ ...base, ownName: "ab" })).ownName).toBeDefined()
    expect(campusSpecialtySchema.safeParse({ ...base, ownName: "Turismo y hotelería" }).success).toBe(true)
  })

  it("sin Otra el nombre propio no se pide", () => {
    expect(campusSpecialtySchema.safeParse({ ...base, specialtyId: 5, isOther: false }).success).toBe(true)
  })
})
