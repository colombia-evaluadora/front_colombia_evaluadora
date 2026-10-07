import { describe, expect, it } from "vitest"

import { agregarReciente } from "@/features/comunicaciones/chat/hooks/use-busquedas-recientes"

describe("agregarReciente", () => {
  it("pone la búsqueda primero, sin duplicados y con máximo 5", () => {
    expect(agregarReciente(["601", "802"], " 802 ")).toEqual(["802", "601"])
    expect(agregarReciente(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"])
    expect(agregarReciente(["a"], "  ")).toEqual(["a"])
  })
})
