import { AxiosError, AxiosHeaders } from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { setAuthToken } = await import("@/lib/api-client")
const { esSinPermiso, tokenSinRoles } = await import("@/features/navigation/lib/sin-roles")

const token = (claims: object) =>
  `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.x`

const conStatus = (status: number) =>
  new AxiosError("x", "ERR", undefined, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

describe("tokenSinRoles", () => {
  afterEach(() => setAuthToken(null))

  it("es verdadero con sesión y sin ningún rol en el token", () => {
    setAuthToken(token({ sub: "funcionario@example.com", roles: [] }))
    expect(tokenSinRoles()).toBe(true)
  })

  it("es falso si el token trae algún rol", () => {
    setAuthToken(token({ sub: "docente@example.com", roles: ["CEVAL-DOCENTE"] }))
    expect(tokenSinRoles()).toBe(false)
  })

  it("no decide sin token en memoria ni con un token ilegible", () => {
    expect(tokenSinRoles()).toBe(false)
    setAuthToken("no-es-un-jwt")
    expect(tokenSinRoles()).toBe(false)
  })
})

describe("esSinPermiso", () => {
  it("solo el 403 cuenta como sin permiso", () => {
    expect(esSinPermiso(conStatus(403))).toBe(true)
    expect(esSinPermiso(conStatus(500))).toBe(false)
    expect(esSinPermiso(new Error("red"))).toBe(false)
  })
})
