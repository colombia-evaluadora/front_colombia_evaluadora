import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import {
  findCatalogId,
  resolveCatalogId,
} from "@/features/establishment/academic-period/api/query/resolve-catalog-id"

const fetchSelectCategory = vi.hoisted(() => vi.fn<(categoria: string) => Promise<SelectCategoryRow[]>>())

vi.mock("@/features/establishment/academic-period/api/query/fetch-select-category", () => ({
  fetchSelectCategory,
}))

const row = (pk: number, nombre: string, valor: string): SelectCategoryRow => ({
  pk_lista_valor: pk,
  nombre,
  valor,
  accion: null,
})

const ROWS = [
  row(1, "Numérica", "NUMERICA"),
  row(2, "Cualitativa", "CUALITATIVA"),
  row(3, "Primero", "1"),
]

beforeEach(() => {
  fetchSelectCategory.mockReset()
  fetchSelectCategory.mockResolvedValue(ROWS)
})

describe("findCatalogId", () => {
  it("por defecto compara contra nombre exacto", () => {
    expect(findCatalogId(ROWS, "Cualitativa")).toBe(2)
    expect(findCatalogId(ROWS, "CUALITATIVA")).toBeUndefined()
    expect(findCatalogId(ROWS, "cualitativa")).toBeUndefined()
  })

  it("match valor", () => {
    expect(findCatalogId(ROWS, "NUMERICA", { match: "valor" })).toBe(1)
    expect(findCatalogId(ROWS, "Numérica", { match: "valor" })).toBeUndefined()
  })

  it("match valorOrNombre", () => {
    expect(findCatalogId(ROWS, "1", { match: "valorOrNombre" })).toBe(3)
    expect(findCatalogId(ROWS, "Primero", { match: "valorOrNombre" })).toBe(3)
  })

  it("normalize reemplaza a match y devuelve la primera fila que calce", () => {
    const normalize = (r: SelectCategoryRow) => (r.valor.toUpperCase() === "NUMERICA" ? "Numérica" : undefined)
    expect(findCatalogId(ROWS, "Numérica", { normalize, match: "valor" })).toBe(1)
    expect(findCatalogId(ROWS, "Cualitativa", { normalize })).toBeUndefined()
  })

  it("vacío o nulo → undefined", () => {
    expect(findCatalogId(ROWS, "")).toBeUndefined()
    expect(findCatalogId(ROWS, undefined)).toBeUndefined()
    expect(findCatalogId(ROWS, null)).toBeUndefined()
  })
})

describe("resolveCatalogId", () => {
  it("pide la categoría y resuelve el pk", async () => {
    await expect(resolveCatalogId(undefined, "TIPO_ESCALA", "Numérica")).resolves.toBe(1)
    expect(fetchSelectCategory).toHaveBeenCalledWith("TIPO_ESCALA")
  })

  it("sin match → undefined", async () => {
    await expect(resolveCatalogId(undefined, "TIPO_ESCALA", "Otra")).resolves.toBeUndefined()
  })

  it("vacío no hace request", async () => {
    await expect(resolveCatalogId(undefined, "TIPO_ESCALA", "")).resolves.toBeUndefined()
    expect(fetchSelectCategory).not.toHaveBeenCalled()
  })

  it("sin queryClient pide el catálogo en cada llamada", async () => {
    await resolveCatalogId(undefined, "GRADOS", "1", { match: "valor" })
    await resolveCatalogId(undefined, "GRADOS", "1", { match: "valor" })
    expect(fetchSelectCategory).toHaveBeenCalledTimes(2)
  })

  it("con queryClient cachea por categoría", async () => {
    const queryClient = new QueryClient()
    await expect(resolveCatalogId(queryClient, "GRADOS", "1", { match: "valor" })).resolves.toBe(3)
    await expect(resolveCatalogId(queryClient, "GRADOS", "Cualitativa")).resolves.toBe(2)
    expect(fetchSelectCategory).toHaveBeenCalledTimes(1)
    await resolveCatalogId(queryClient, "OTRA", "Numérica")
    expect(fetchSelectCategory).toHaveBeenCalledTimes(2)
  })
})
