import { expect, it } from "vitest"

import { formValuesEqual } from "@/features/establishment/academic-period/utils/form-values-equal"

it("ignora el orden de claves y null/undefined", () => {
  expect(formValuesEqual({ a: 1, b: null }, { b: undefined, a: 1 })).toBe(true)
  expect(formValuesEqual({ a: 1 }, { a: 1, c: undefined })).toBe(true)
})

it("detecta cambios reales", () => {
  expect(formValuesEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false)
  expect(formValuesEqual({ a: "" }, { a: null })).toBe(false)
  expect(formValuesEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
})
