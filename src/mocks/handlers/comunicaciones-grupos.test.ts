import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { Conversacion, Mensaje, Miembro } from "@/features/comunicaciones/chat/api/types"
import { comunicacionesHandlers } from "@/mocks/handlers/comunicaciones"
import { comunicacionesGruposHandlers } from "@/mocks/handlers/comunicaciones-grupos"
import { authUsers, createMockAccessToken } from "@/mocks/db/auth"
import { notificacionesDb } from "@/mocks/db/notificaciones"

// Contrato del mock = comms-service (ChatService, grupos): permisos de administrador, salir con
// sucesión y aviso CHAT_MENSAJE agrupado, atendiendo a cada persona por su token.
const server = setupServer(...comunicacionesGruposHandlers, ...comunicacionesHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

const base = "http://localhost/api/eval-col/comunicaciones"
const token = (email: string) => createMockAccessToken(authUsers.find((u) => u.email === email)!)
const ADMIN = token("admin@example.com") // Andrés (1)
const DOCENTE = token("docente@example.com") // Darlene (2)
const USER = token("user@example.com") // Marta (3)

async function llamar<T>(quien: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${quien}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as { rows?: T[]; message?: string }
  return { status: res.status, rows: json.rows ?? [], message: json.message }
}

describe("grupos del chat (mock multiusuario)", () => {
  it("crear, permisos, quitar, salir con sucesión y aviso agrupado", async () => {
    expect((await llamar(ADMIN, "POST", "/conversaciones", { NOMBRE: "Solo", TIPO: "GRUPO", MIEMBROS: [] })).status).toBe(400)
    const g = (await llamar<Conversacion>(ADMIN, "POST", "/conversaciones", {
      NOMBRE: "Proyecto feria", TIPO: "GRUPO", CATEGORIA: "GENERAL", MIEMBROS: [2, 3],
    })).rows[0]
    expect(g.esAdmin).toBe(true)
    expect(g.totalMiembros).toBe(3)
    const dePara = async (quien: string) =>
      (await llamar<Conversacion>(quien, "GET", "/conversaciones")).rows.find((c) => c.id === g.id)
    expect((await dePara(DOCENTE))?.esAdmin).toBe(false)

    // Un miembro no administra.
    expect((await llamar(DOCENTE, "PATCH", `/conversaciones/${g.id}/miembros/3/eliminar`)).status).toBe(403)
    expect((await llamar(DOCENTE, "PATCH", `/conversaciones/${g.id}/miembros/3/rol`, { ROL: "ADMIN" })).status).toBe(403)

    // Mensajes: aviso a los demás, uno vivo por conversación que suma el conteo.
    await llamar(ADMIN, "POST", `/conversaciones/${g.id}/mensajes`, { TEXTO: "Hola equipo" })
    await llamar(ADMIN, "POST", `/conversaciones/${g.id}/mensajes`, { TEXTO: "¿Mañana a las 7?" })
    const avisos = notificacionesDb.filter((n) => n.tipo === "CHAT_MENSAJE" && n.deep_link?.includes(`canal=${g.id}&`))
    expect(avisos.map((n) => n.usuario).sort()).toEqual(["docente@example.com", "user@example.com"])
    expect(avisos.every((n) => n.conteo === 2)).toBe(true)
    const historial = (await llamar<Mensaje>(DOCENTE, "GET", `/conversaciones/${g.id}/mensajes`)).rows
    expect(historial.filter((m) => !m.sistema).map((m) => [m.texto, m.esPropio])).toEqual([
      ["Hola equipo", false],
      ["¿Mañana a las 7?", false],
    ])

    // Administradores: siempre queda uno.
    expect((await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/miembros/1/rol`, { ROL: "MIEMBRO" })).status).toBe(409)

    // Quitar a Marta: deja de verlo.
    expect((await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/miembros/1/eliminar`)).status).toBe(400)
    await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/miembros/3/eliminar`)
    expect(await dePara(USER)).toBeUndefined()
    expect((await llamar(USER, "GET", `/conversaciones/${g.id}/mensajes`)).status).toBe(404)

    // Andrés (único admin) sale: Darlene, la más antigua que queda, administra.
    await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/salir`)
    expect(await dePara(ADMIN)).toBeUndefined()
    const deDarlene = await dePara(DOCENTE)
    expect(deDarlene?.esAdmin).toBe(true)
    expect(deDarlene?.totalMiembros).toBe(1)
    const miembros = (await llamar<Miembro>(DOCENTE, "GET", `/conversaciones/${g.id}/miembros`)).rows
    expect(miembros.map((m) => [m.id, m.esAdmin])).toEqual([[2, true]])
  })
})
