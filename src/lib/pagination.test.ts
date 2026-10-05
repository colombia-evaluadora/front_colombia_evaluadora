import { describe, expect, it } from "vitest"

import { toPageCount, toPaginated, toTotalCount } from "@/lib/pagination"

describe("toTotalCount", () => {
  it("acepta números y strings numéricos", () => {
    expect(toTotalCount(42)).toBe(42)
    expect(toTotalCount("42")).toBe(42)
  })

  it("devuelve 0 si falta, es null o no es numérico", () => {
    expect(toTotalCount(undefined)).toBe(0)
    expect(toTotalCount(null)).toBe(0)
    expect(toTotalCount("")).toBe(0)
    expect(toTotalCount("abc")).toBe(0)
    expect(toTotalCount(-3)).toBe(0)
  })
})

describe("toPageCount", () => {
  it("redondea hacia arriba", () => {
    expect(toPageCount(21, 10)).toBe(3)
    expect(toPageCount(20, 10)).toBe(2)
  })

  it("tiene piso de 1", () => {
    expect(toPageCount(0, 10)).toBe(1)
  })

  it("pageSize inválido devuelve 1", () => {
    expect(toPageCount(50, 0)).toBe(1)
    expect(toPageCount(50, -5)).toBe(1)
    expect(toPageCount(50, Number.NaN)).toBe(1)
  })
})

describe("toPaginated", () => {
  interface Row {
    id: number
    total_count?: number | string
    totalCount?: number
  }

  it("mapea filas y toma el total de la primera", () => {
    const rows: Row[] = [
      { id: 1, total_count: 25 },
      { id: 2, total_count: 25 },
    ]
    expect(toPaginated(rows, { pageSize: 10, map: (r) => r.id })).toEqual({
      rows: [1, 2],
      pageCount: 3,
      totalCount: 25,
    })
  })

  it("lista vacía o ausente", () => {
    const empty = { rows: [], pageCount: 1, totalCount: 0 }
    expect(toPaginated([], { pageSize: 10 })).toEqual(empty)
    expect(toPaginated(undefined, { pageSize: 10 })).toEqual(empty)
    expect(toPaginated(null, { pageSize: 10 })).toEqual(empty)
  })

  it("total ausente o string", () => {
    expect(toPaginated<Row>([{ id: 1 }], { pageSize: 10 }).totalCount).toBe(0)
    expect(toPaginated<Row>([{ id: 1, total_count: "31" }], { pageSize: 10 })).toMatchObject({
      totalCount: 31,
      pageCount: 4,
    })
  })

  it("sin map devuelve las filas tal cual", () => {
    const rows: Row[] = [{ id: 7, total_count: 1 }]
    expect(toPaginated(rows, { pageSize: 10 }).rows).toBe(rows)
  })

  it("respeta totalKey", () => {
    const rows: Row[] = [{ id: 1, totalCount: 11 }]
    expect(toPaginated(rows, { pageSize: 5, totalKey: "totalCount" })).toMatchObject({
      totalCount: 11,
      pageCount: 3,
    })
  })

  it("pageSize 0 no produce Infinity", () => {
    expect(toPaginated<Row>([{ id: 1, total_count: 5 }], { pageSize: 0 }).pageCount).toBe(1)
  })
})
