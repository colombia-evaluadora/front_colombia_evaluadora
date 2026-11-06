import { describe, expect, it } from "vitest"

import { enmascararCorreo, enmascararTelefono } from "@/features/establishment/employees/utils/enmascarar"

describe("enmascarar", () => {
  it("enmascara el correo como el documento (Regla 11)", () => {
    expect(enmascararCorreo("juan.perez@gmail.com")).toBe("ju****@gm***.com")
    expect(enmascararCorreo("")).toBe("")
  })

  it("no vuelve a enmascarar lo que ya llegó enmascarado", () => {
    expect(enmascararCorreo("ju****@gm***.com")).toBe("ju****@gm***.com")
    expect(enmascararTelefono("300***4567")).toBe("300***4567")
  })

  it("enmascara el teléfono", () => {
    expect(enmascararTelefono("3004564567")).toBe("300***4567")
    expect(enmascararTelefono("1234567")).toBe("12***67")
  })
})
