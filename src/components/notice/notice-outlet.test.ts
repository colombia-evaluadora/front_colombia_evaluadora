import { describe, expect, it } from "vitest"

import { elegirDuenoOutlet } from "@/components/notice/outlet-owner"

describe("elegirDuenoOutlet", () => {
  it("sin outlets no hay dueño", () => {
    expect(elegirDuenoOutlet([])).toBeNull()
  })

  it("con un solo outlet, ese pinta", () => {
    expect(elegirDuenoOutlet([{ id: "a", prioritario: false }])).toBe("a")
  })

  it("entre varios normales pinta el primero registrado", () => {
    expect(
      elegirDuenoOutlet([
        { id: "a", prioritario: false },
        { id: "b", prioritario: false },
      ]),
    ).toBe("a")
  })

  it("el prioritario (toolbar) gana aunque se registre después", () => {
    expect(
      elegirDuenoOutlet([
        { id: "pagina", prioritario: false },
        { id: "toolbar", prioritario: true },
      ]),
    ).toBe("toolbar")
  })

  it("al irse el prioritario pasa el aviso al outlet de la página", () => {
    expect(elegirDuenoOutlet([{ id: "pagina", prioritario: false }])).toBe("pagina")
  })
})
