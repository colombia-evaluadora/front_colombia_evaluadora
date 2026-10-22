import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type {
  Conversacion,
  Mensaje,
  Miembro,
  OpcionesSeleccion,
  Persona,
  ResolucionSeleccion,
} from "@/features/comunicaciones/chat/api/types"
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

  it("decisiones de Natalia: alta por grado/grupo/rol sin duplicados ni acudientes, solo el creador gestiona", async () => {
    // Opciones del selector grupal.
    const [opciones] = (await llamar<OpcionesSeleccion>(ADMIN, "GET", "/grupos/seleccion/opciones")).rows
    expect(opciones.grupos.map((g) => g.etiqueta)).toContain("Sexto 601")
    expect(opciones.roles.map((r) => r.valor)).toContain("Docente")

    // Vista previa: Sexto 601 (5 + Sofía) + rol Docente (7) + a mano Sofía (repetida) y el acudiente (9).
    const cuerpo = { GRADOS: [], GRUPOS: [601], ROLES: ["Docente"], USUARIOS: [10, 9] }
    const [previa] = (await llamar<ResolucionSeleccion>(ADMIN, "POST", "/grupos/seleccion/resolver", cuerpo)).rows
    expect(previa.total).toBe(13)
    expect(previa.personas.some((p) => p.id === 9)).toBe(false)
    expect(new Set(previa.personas.map((p) => p.id)).size).toBe(13)

    // Crear con la misma selección: un solo mensaje de sistema agregado y un aviso por persona.
    const g = (await llamar<Conversacion>(ADMIN, "POST", "/conversaciones", {
      NOMBRE: "Sexto 601 y profes", TIPO: "GRUPO", CATEGORIA: "GENERAL", MIEMBROS: [10, 9], GRUPOS: [601], ROLES: ["Docente"],
    })).rows[0]
    expect(g.totalMiembros).toBe(14)
    const historial = (await llamar<Mensaje>(ADMIN, "GET", `/conversaciones/${g.id}/mensajes`)).rows
    expect(historial.filter((m) => m.sistema).map((m) => m.texto)).toEqual(["agregó a 13 personas a Sexto 601 y profes."])
    const avisos = notificacionesDb.filter((n) => n.tipo === "CHAT_GRUPO_AGREGADO" && n.deep_link?.endsWith(`canal=${g.id}`))
    expect(avisos.map((n) => n.usuario).sort()).toEqual(["docente@example.com", "user@example.com"])

    // Repetir no duplica; la vista previa cuenta quiénes ya estaban.
    const [otra] = (await llamar<ResolucionSeleccion>(ADMIN, "POST", "/grupos/seleccion/resolver", {
      ...cuerpo, FK_CONVERSACION: g.id,
    })).rows
    expect([otra.total, otra.yaEnElGrupo]).toEqual([0, 13])
    expect((await llamar<Miembro>(ADMIN, "POST", `/conversaciones/${g.id}/miembros/masivo`, cuerpo)).rows).toHaveLength(14)

    // b) Quien entra después ve todo el historial.
    await llamar(ADMIN, "POST", `/conversaciones/${g.id}/mensajes`, { TEXTO: "Bienvenidos" })
    await llamar(ADMIN, "POST", `/conversaciones/${g.id}/miembros/masivo`, { GRADOS: ["Séptimo"] })
    const deSeptimo = (await llamar<Miembro>(ADMIN, "GET", `/conversaciones/${g.id}/miembros`)).rows
    expect(deSeptimo).toHaveLength(17)

    // Solo el creador gestiona: un miembro no agrega, no quita, no nombra; ni el creador nombra.
    expect((await llamar(DOCENTE, "POST", `/conversaciones/${g.id}/miembros/masivo`, { GRADOS: ["Sexto"] })).status).toBe(403)
    expect((await llamar(DOCENTE, "POST", "/grupos/seleccion/resolver", { GRADOS: ["Sexto"], FK_CONVERSACION: g.id })).status).toBe(403)
    expect((await llamar(DOCENTE, "PATCH", `/conversaciones/${g.id}/miembros/3/eliminar`)).status).toBe(403)
    const promover = await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/miembros/2/rol`, { ROL: "ADMIN" })
    expect(promover.status).toBe(403)
    expect(promover.message).toMatch(/no se nombran administradores/)

    // c) A quien quitan pierde el acceso; sus mensajes quedan para los demás.
    await llamar(USER, "POST", `/conversaciones/${g.id}/mensajes`, { TEXTO: "Soy Marta" })
    await llamar(ADMIN, "PATCH", `/conversaciones/${g.id}/miembros/3/eliminar`)
    expect((await llamar(USER, "GET", `/conversaciones/${g.id}/mensajes`)).status).toBe(404)
    expect((await llamar<Conversacion>(USER, "GET", "/conversaciones")).rows.some((c) => c.id === g.id)).toBe(false)
    expect((await llamar<Mensaje>(DOCENTE, "GET", `/conversaciones/${g.id}/mensajes`)).rows.map((m) => m.texto)).toEqual(
      expect.arrayContaining(["Bienvenidos", "Soy Marta"]),
    )

    // El buscador de un grupo no ofrece acudientes.
    const buscador = (await llamar<Persona>(ADMIN, "GET", "/personas?paraGrupo=true")).rows
    expect(buscador.some((p) => p.perfil === "ACUDIENTE")).toBe(false)
  })
})
