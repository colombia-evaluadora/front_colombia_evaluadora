import { describe, expect, it } from "vitest"

import { formatBytes, storageRisks, type StorageStatus } from "@/lib/offline/storage-status"

const base: StorageStatus = { persisted: true, usage: 10, quota: 100, installed: true, ios: false }

describe("storageRisks", () => {
  it("sin riesgos", () => expect(storageRisks(base)).toEqual(["ok"]))
  it("no persistido", () => expect(storageRisks({ ...base, persisted: false })).toEqual(["no-persistido"]))
  it("cuota al 80%", () => expect(storageRisks({ ...base, usage: 80 })).toEqual(["cuota"]))
  it("iOS sin instalar va primero", () =>
    expect(storageRisks({ ...base, ios: true, installed: false, persisted: false })).toEqual([
      "ios-sin-instalar",
      "no-persistido",
    ]))
})

describe("formatBytes", () => {
  it("formatea", () => {
    expect(formatBytes(null)).toBe("—")
    expect(formatBytes(5 * 1024 ** 2)).toBe("5.0 MB")
  })
})
