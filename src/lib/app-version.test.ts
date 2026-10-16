import { describe, expect, it } from "vitest"

import { isBelowMinVersion } from "@/lib/app-version"

describe("isBelowMinVersion", () => {
  it("compara por la fecha del build", () => {
    expect(isBelowMinVersion("2026.09.30-abc1234", "2026.10.01")).toBe(true)
    expect(isBelowMinVersion("2026.10.01-abc1234", "2026.10.01")).toBe(false)
  })
  it("un mínimo vacío o ilegible nunca obliga", () => {
    expect(isBelowMinVersion("2026.09.30-abc", null)).toBe(false)
    expect(isBelowMinVersion("2026.09.30-abc", "v2")).toBe(false)
  })
})
