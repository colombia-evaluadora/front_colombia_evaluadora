import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { employeesDb } from "@/mocks/db/employees"
import { funcionariosHandlers, sinAutorizacion } from "@/mocks/handlers/funcionarios"
import { toFicha } from "@/features/establishment/employees/api/query/use-funcionario-ficha"
import { toFuncionario } from "@/features/establishment/employees/api/query/use-funcionarios"

// Regla 116 (sso V579.4): sin la autorización del funcionario, el EE que lo agregó ve nombre y
// roles; documento, contacto, nacimiento, género, foto y dirección llegan en null.
const server = setupServer(...funcionariosHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const BASE = "http://localhost/api/eval-col/establecimientos/funcionarios"
const idRestringido = [...sinAutorizacion][0]
const libre = employeesDb.find((e) => !sinAutorizacion.has(e.id as number))

describe("funcionarios sin autorización de datos", () => {
  it("el listado oculta el documento y marca datos_restringidos", async () => {
    const res = await fetch(`${BASE}/query`, { method: "POST", body: JSON.stringify({ pageIndex: 0, pageSize: 1000 }) })
    const { rows } = (await res.json()) as { rows: Parameters<typeof toFuncionario>[0][] }
    const fila = rows.find((r) => r.pk_empleado === idRestringido)
    expect(fila?.numero_documento).toBeNull()
    const item = toFuncionario(fila!)
    expect(item.dataRestricted).toBe(true)
    expect(item.documentNumber).toBe("")
    expect(item.name).not.toBe("")
    const otro = toFuncionario(rows.find((r) => r.pk_empleado === libre?.id)!)
    expect(otro.dataRestricted).toBe(false)
    expect(otro.documentNumber).not.toBe("")
  })

  it("la ficha trae los datos personales en null", async () => {
    const res = await fetch(`${BASE}/${idRestringido}/ficha`)
    const { rows } = (await res.json()) as { rows: Parameters<typeof toFicha>[0][] }
    const ficha = toFicha(rows[0])
    expect(ficha.dataRestricted).toBe(true)
    expect(ficha.identification).toBe("")
    expect(ficha.email).toBe("")
    expect(ficha.phone).toBe("")
    expect(ficha.birthDate).toBe("")
    expect(ficha.complementary.address).toBe("")
    expect(ficha.photoArchivoId).toBeNull()
    expect(ficha.canCorrectIdentity).toBe(false)
    expect(ficha.firstName).not.toBe("")
  })

  it("guardar con contacto responde 400", async () => {
    const res = await fetch(`${BASE}/${idRestringido}/ficha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ CON_CONTACTO: true, CORREO: "x@y.co" }),
    })
    expect(res.status).toBe(400)
  })
})
