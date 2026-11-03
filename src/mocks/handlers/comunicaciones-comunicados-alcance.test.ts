import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import type { MenuPermission } from "@/features/navigation/api/types/menu-permission"
import type { OpcionesComunicado, Persona } from "@/features/comunicaciones/chat/api/types"
import { authUsers, createMockAccessToken } from "@/mocks/db/auth"
import { rolesConComunicados } from "@/mocks/db/comunicaciones-seleccion"
import { comunicacionesComunicadosHandlers } from "@/mocks/handlers/comunicaciones-comunicados"
import { rolesHandlers } from "@/mocks/handlers/roles"

// Contrato del mock = comms-service (AlcanceComunicado): permiso dinámico COMUNICADOS por rol y
// alcance jerárquico de destinatarios (403 fuera de rango).
const server = setupServer(...comunicacionesComunicadosHandlers, ...rolesHandlers)
// Los handlers de comunicados y de roles usan rutas relativas: se resuelven contra este origen.
beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen()
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const token = (email: string) => createMockAccessToken(authUsers.find((u) => u.email === email)!)
const ADMIN = token("admin@example.com")
const COORD = token("coordinador@example.com")
const DOCENTE = token("docente@example.com")

let n = 0
async function llamar<T>(quien: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`http://localhost/api/eval-col${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${quien}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as { rows?: T[] }
  return { status: res.status, rows: json.rows ?? [] }
}

const crear = (quien: string, audiencia: string[], destinos: Record<string, unknown>) =>
  llamar(quien, "POST", "/comunicaciones/comunicados", {
    TITULO: `Circular alcance ${++n}`,
    AUDIENCIA: audiencia,
    DESTINOS: destinos,
    PUBLICAR_EN: new Date().toISOString(),
    CONTENIDO_HTML: "<p>Hola</p>",
  })

const op = (valor: string | number) => ({ VALOR: String(valor), ETIQUETA: String(valor) })

const tieneComunicados = async (quien: string) =>
  (await llamar<MenuPermission>(quien, "GET", "/usuarios/permisos-menu")).rows.some(
    (p) => p.codigo === "COMUNICADOS" && p.puede_crear,
  )

describe("comunicados: permiso por rol y alcance (mock)", () => {
  it("el docente sin el permiso no ve ni crea; con el permiso de su rol solo llega a su grupo", async () => {
    expect(await tieneComunicados(DOCENTE)).toBe(false)
    expect((await llamar(DOCENTE, "GET", "/comunicaciones/comunicados/destinos/opciones")).status).toBe(403)
    expect((await crear(DOCENTE, ["ESTUDIANTES"], {})).status).toBe(403)

    rolesConComunicados.add("CEVAL-DOCENTE")
    try {
      expect(await tieneComunicados(DOCENTE)).toBe(true)
      const [o] = (await llamar<OpcionesComunicado>(DOCENTE, "GET", "/comunicaciones/comunicados/destinos/opciones")).rows
      expect(o.grupos.map((g) => g.valor)).toEqual(["601"])
      expect(o.roles).toEqual([])
      expect(o.audiencias).toEqual(["ESTUDIANTES", "PADRES"])
      expect((await crear(DOCENTE, [], { GRUPOS: [op(601)], PARA: "AMBOS" })).status).toBe(200)
      // Fuera de rango: otro grupo, otro docente, audiencia de funcionarios.
      expect((await crear(DOCENTE, [], { GRUPOS: [op(701)] })).status).toBe(403)
      expect((await crear(DOCENTE, [], { USUARIOS: [op(3)] })).status).toBe(403)
      expect((await crear(DOCENTE, ["DOCENTES"], {})).status).toBe(403)
      const personas = (await llamar<Persona>(DOCENTE, "GET", "/comunicaciones/comunicados/destinos/personas")).rows
      expect(personas.some((p) => p.perfil === "DOCENTE")).toBe(false)
    } finally {
      rolesConComunicados.delete("CEVAL-DOCENTE")
    }
  })

  it("el coordinador ve solo su jornada y acota en cascada", async () => {
    expect(await tieneComunicados(COORD)).toBe(true)
    const [o] = (await llamar<OpcionesComunicado>(COORD, "GET", "/comunicaciones/comunicados/destinos/opciones")).rows
    expect(o.grupos.map((g) => g.valor)).toEqual(["601", "602"])
    expect((await crear(COORD, [], { GRUPOS: [op(701)] })).status).toBe(403)
    expect((await crear(COORD, ["DOCENTES"], { JORNADAS: [op(3)] })).status).toBe(200)
    expect((await llamar(COORD, "GET", "/comunicaciones/comunicados/destinos/opciones?establecimiento=2")).status).toBe(403)
  })

  it("el super administrador elige cualquier establecimiento", async () => {
    const [o] = (await llamar<OpcionesComunicado>(ADMIN, "GET", "/comunicaciones/comunicados/destinos/opciones")).rows
    expect(o.todos).toBe(true)
    expect(o.establecimientos.map((e) => e.valor)).toEqual(["1", "2"])
    expect(o.grupos).toEqual([])
    const [uno] = (await llamar<OpcionesComunicado>(ADMIN, "GET", "/comunicaciones/comunicados/destinos/opciones?establecimiento=1&jornada=4")).rows
    expect(uno.grupos.map((g) => g.valor)).toEqual(["701"])
    expect((await crear(ADMIN, [], { GRUPOS: [op(701)] })).status).toBe(200)
  })
})
