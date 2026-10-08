import { describe, expect, it } from "vitest"

import {
  applyGradeFieldRules,
  isFieldRequired,
  isFieldVisible,
  type MatriculaFieldSettingsMap,
} from "@/features/coverage/utils/matricula-field-settings"

const EMAIL = "student-contact-email"
const oculto: MatriculaFieldSettingsMap = {
  [EMAIL]: { requerido: false, visible: false },
  "student-contact-phone": { requerido: true, visible: false },
}

describe("applyGradeFieldRules", () => {
  it("sin grado elegido manda la configuración", () => {
    expect(applyGradeFieldRules(oculto, "")).toBe(oculto)
    expect(applyGradeFieldRules(oculto, undefined)).toBe(oculto)
  })

  it("de 6° en adelante muestra el correo aunque la configuración lo oculte", () => {
    const settings = applyGradeFieldRules(oculto, "6")
    expect(isFieldVisible(settings, EMAIL)).toBe(true)
    expect(isFieldVisible(applyGradeFieldRules(oculto, "11"), EMAIL)).toBe(true)
  })

  it("en bachillerato conserva el 'requerido' de la configuración", () => {
    const requerido: MatriculaFieldSettingsMap = { [EMAIL]: { requerido: true, visible: false } }
    expect(isFieldRequired(applyGradeFieldRules(requerido, "8"), EMAIL)).toBe(true)
    expect(isFieldRequired(applyGradeFieldRules(oculto, "8"), EMAIL)).toBe(false)
  })

  it("en preescolar y primaria oculta el correo y deja de exigirlo", () => {
    const visibleRequerido: MatriculaFieldSettingsMap = { [EMAIL]: { requerido: true, visible: true } }
    for (const grado of ["-2", "0", "1", "5"]) {
      const settings = applyGradeFieldRules(visibleRequerido, grado)
      expect(isFieldVisible(settings, EMAIL)).toBe(false)
      expect(isFieldRequired(settings, EMAIL)).toBe(false)
    }
  })

  it("no toca los demás campos", () => {
    const settings = applyGradeFieldRules(oculto, "9")
    expect(settings?.["student-contact-phone"]).toEqual({ requerido: true, visible: false })
  })

  it("funciona sin configuración cargada", () => {
    expect(isFieldVisible(applyGradeFieldRules(undefined, "3"), EMAIL)).toBe(false)
    expect(isFieldVisible(applyGradeFieldRules(undefined, "7"), "student-contact-phone")).toBe(true)
  })
})
