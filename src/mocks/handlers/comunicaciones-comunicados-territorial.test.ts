import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import type { ComunicadoTerritorial, ComunicadoTerritorialDetalle } from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import { comunicadosTerritorialSearchSchema } from "@/features/comunicaciones/territorial/api/schema"
import { comunicacionesComunicadosHandlers } from "@/mocks/handlers/comunicaciones-comunicados"
import { comunicados } from "@/mocks/db/comunicaciones-comunicados"

const server = setupServer(...comunicacionesComunicadosHandlers)

beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  // Un segundo comunicado (id impar) cae en el otro establecimiento del mock.
  comunicados.push({ ...comunicados[0], conversacionId: 9, titulo: "Jornada pedagógica rural" })
  server.listen()
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const base = "http://localhost/api/eval-col/comunicaciones/comunicados/territorial"

async function lista(params: string) {
  const res = await fetch(`${base}?${params}`)
  const json = (await res.json().catch(() => ({}))) as { rows?: ComunicadoTerritorial[]; totalCount?: number }
  return { status: res.status, rows: json.rows ?? [], total: json.totalCount ?? 0 }
}

// Consulta territorial (M.1.TER.1, QA 830): filtro por establecimiento y orden por columna.
describe("consulta territorial de comunicados (mock)", () => {
  it("lista los establecimientos del filtro", async () => {
    const res = await fetch(`${base}/establecimientos`)
    const { rows } = (await res.json()) as { rows: { valor: string; etiqueta: string }[] }
    expect(rows.map((r) => r.valor)).toEqual(["1", "2"])
  })

  it("filtra por establecimiento", async () => {
    const todos = await lista("pagina=0&tamano=100")
    const solo2 = await lista("establecimiento=2&pagina=0&tamano=100")
    expect(solo2.rows.length).toBeGreaterThan(0)
    expect(solo2.rows.every((r) => r.establecimientoId === 2)).toBe(true)
    expect(solo2.total).toBeLessThan(todos.total)
  })

  it("ordena por establecimiento en ambas direcciones y rechaza columnas desconocidas", async () => {
    const asc = await lista("sortBy=establecimiento&sortDir=asc&pagina=0&tamano=100")
    const desc = await lista("sortBy=establecimiento&sortDir=desc&pagina=0&tamano=100")
    expect(asc.rows[0].establecimiento).toBe("IE Central")
    expect(desc.rows[0].establecimiento).toBe("IE Rural Norte")
    expect((await lista("sortBy=otra")).status).toBe(400)
  })

  it("el detalle trae los adjuntos con su archivo, y ninguno si está anulado", async () => {
    const adjunto = { id: 1, archivoId: 77, nombre: "Lectura.pdf", formato: "PDF" as const, peso: 2048 }
    comunicados.push(
      { ...comunicados[0], conversacionId: 21, adjuntos: [adjunto] },
      { ...comunicados[0], conversacionId: 23, estado: "ANULADO", adjuntos: [adjunto] },
    )
    const detalle = async (id: number) => {
      const { rows } = (await (await fetch(`${base}/${id}`)).json()) as { rows: ComunicadoTerritorialDetalle[] }
      return rows[0]
    }
    expect((await detalle(21)).adjuntos).toEqual([adjunto])
    expect((await detalle(23)).adjuntos).toEqual([])
  })

  it("nunca devuelve cancelados", async () => {
    const { rows } = await lista("pagina=0&tamano=100")
    expect(rows.some((r) => (r.estado as string) === "CANCELADO")).toBe(false)
  })
})

describe("comunicadosTerritorialSearchSchema", () => {
  it("una URL inválida no tira y cae a los valores por defecto", () => {
    expect(
      comunicadosTerritorialSearchSchema.parse({
        establecimiento: "abc",
        estado: "CANCELADO",
        sortBy: "otra",
        page: "x",
      }),
    ).toEqual({ establecimiento: undefined, estado: undefined, sortBy: undefined, page: 0, pageSize: 10 })
  })
})
