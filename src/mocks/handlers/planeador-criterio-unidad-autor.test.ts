import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { createMockAccessToken, findUserByEmail } from "@/mocks/db/auth"

// QA 71 / Regla 27 en el mock (paridad con sso fn_unidad_assert_criterio_propietario
// y el puede_gestionar de fn_unidad_criterio_listar): el docente puro edita y
// elimina solo los criterios que creó; los directivos, todos. La unidad 1 del
// seed trae criterios de "otro docente" (150, 151...).

vi.stubGlobal("location", new URL("http://localhost/app/planeador"))
const { planeadorHandlers } = await import("@/mocks/handlers/planeador")

const server = setupServer(...planeadorHandlers)
const API = "http://localhost/api/eval-col/planeador"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function como(email: string) {
  const token = createMockAccessToken(findUserByEmail(email)!)
  return (url: string, init: RequestInit = {}) =>
    fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
}

const docente = como("docente@example.com")
const admin = como("admin@example.com")

interface FilaCriterio {
  pk_tcriterio_unidad: number
  descripcion: string
  puede_gestionar: boolean
  autor: string
}

async function criterios(quien: typeof docente): Promise<FilaCriterio[]> {
  return (await (await quien(`${API}/unidades/1/criterios`)).json()).rows
}

const NIVELES = ["Bajo", "Básico", "Alto", "Superior"].map((nombre, i) => ({
  nombre,
  descripcion: `Nivel ${nombre}`,
  valoracionId: i + 1,
}))

describe("criterios de la unidad: autoría", () => {
  it("el docente no gestiona los criterios de otro; el directivo sí", async () => {
    const ajeno = (await criterios(docente)).find((c) => c.pk_tcriterio_unidad === 150)!
    expect(ajeno.puede_gestionar).toBe(false)
    expect((await criterios(admin)).find((c) => c.pk_tcriterio_unidad === 150)!.puede_gestionar).toBe(true)

    const put = await docente(`${API}/unidades/criterios/150`, {
      method: "PUT",
      body: JSON.stringify({ nombre: "x" }),
    })
    expect(put.status).toBe(403)
    expect((await put.json()).message).toMatch(/solo su autor lo edita o elimina/)
    expect((await docente(`${API}/unidades/criterios/150`, { method: "PATCH" })).status).toBe(403)
  })

  it("el autor edita y elimina su propio criterio", async () => {
    const creado = await (
      await docente(`${API}/unidades/1/criterios`, {
        method: "POST",
        body: JSON.stringify({ nombre: "Propio del docente", niveles: NIVELES }),
      })
    ).json()
    const id = creado.criterio.id as number

    const propio = (await criterios(docente)).find((c) => c.pk_tcriterio_unidad === id)!
    expect(propio.puede_gestionar).toBe(true)

    const put = await docente(`${API}/unidades/criterios/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nombre: "Propio editado", niveles: NIVELES }),
    })
    expect(put.status).toBe(200)
    expect((await criterios(docente)).find((c) => c.pk_tcriterio_unidad === id)!.descripcion).toBe("Propio editado")

    expect((await docente(`${API}/unidades/criterios/${id}`, { method: "PATCH" })).status).toBe(200)
    expect((await criterios(docente)).some((c) => c.pk_tcriterio_unidad === id)).toBe(false)
  })
})
