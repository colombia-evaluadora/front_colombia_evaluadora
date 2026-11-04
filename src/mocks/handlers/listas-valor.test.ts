import { afterAll, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { listasValorHandlers } from "@/mocks/handlers/listas-valor"

const server = setupServer(...listasValorHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

const BASE = "http://localhost/api/eval-col/listas-valor"
async function llamar(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  return { status: res.status, data: json.rows?.[0]?.resultado, message: json.message }
}

it("lista categorías y los íconos de prueba", async () => {
  expect((await llamar("GET", "/categorias")).data.length).toBeGreaterThan(0)
  const iconos = (await llamar("GET", "/iconos")).data
  expect(iconos.length).toBeGreaterThan(0)
  // La semilla se sirve por /files/public como un ícono subido.
  expect((await fetch(`http://localhost/api/files/public/${iconos[0].valor}`)).status).toBe(200)
})

const FILES = "http://localhost/api/files/eval-col/listas-valor"
async function subir(path: string, nombre: string, archivo?: File) {
  const form = new FormData()
  form.append("NOMBRE", nombre)
  form.append("HABILITADO", "true")
  if (archivo) form.append("IMAGEN", archivo)
  const res = await fetch(FILES + path, { method: "POST", body: form })
  const json = await res.json()
  return { status: res.status, data: json.rows?.[0]?.resultado }
}
const svg = new File(['<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'], "hex.svg", { type: "image/svg+xml" })

it("crea un ícono por multipart y rechaza nombre repetido, archivo inválido o sembrado", async () => {
  const creado = await subir("/iconos", "Hexágono", svg)
  expect(creado.status).toBe(200)
  expect(creado.data.valor).toMatch(/^mock\/iconografia\/\d+\.svg$/)
  expect((await fetch(`http://localhost/api/files/public/${creado.data.valor}`)).status).toBe(200)
  expect((await subir("/iconos", "hexágono", svg)).status).toBe(409)
  expect((await subir("/iconos", "Sin imagen")).status).toBe(400)
  expect((await subir("/iconos", "Foto", new File(["x"], "a.jpg"))).status).toBe(400)
  // Modificar sin archivo conserva el que tenía.
  const editado = await subir(`/iconos/${creado.data.pkIcono}`, "Hexágono azul")
  expect(editado.data.valor).toBe(creado.data.valor)
})

it("reordena los íconos y exige la lista completa", async () => {
  const b = (await subir("/iconos", "Medalla", svg)).data
  const c = (await subir("/iconos", "Trofeo", svg)).data
  const antes = (await llamar("GET", "/iconos")).data.map((i: { pkIcono: number }) => i.pkIcono)
  const nuevo = [c.pkIcono, ...antes.filter((pk: number) => pk !== c.pkIcono)]
  const res = await llamar("PUT", "/iconos/orden", { ORDEN: JSON.stringify(nuevo) })
  expect(res.data.map((i: { pkIcono: number }) => i.pkIcono)).toEqual(nuevo)
  expect((await llamar("PUT", "/iconos/orden", { ORDEN: JSON.stringify([b.pkIcono]) })).status).toBe(400)
})

it("crea una lista con valores, la reordena y la elimina", async () => {
  const creada = await llamar("POST", "/categorias", {
    CATEGORIA: "PRUEBA",
    NOMBRE: null,
    ORDINAL: false,
    VALORES: JSON.stringify([
      { nombre: "Uno", valor: "UNO" },
      { nombre: "Dos", valor: "DOS", predeterminado: true },
    ]),
  })
  expect(creada.status).toBe(200)
  const [uno, dos] = creada.data.valores
  expect(uno.pkListaValor).not.toBe(dos.pkListaValor)
  expect(creada.data.predeterminado).toBe(dos.pkListaValor)
  const orden = await llamar("PUT", "/categorias/PRUEBA/orden", {
    ORDEN: JSON.stringify([dos.pkListaValor, uno.pkListaValor]),
  })
  expect(orden.data[0].nombre).toBe("Dos")
  expect((await llamar("PUT", "/categorias/PRUEBA/eliminar")).status).toBe(200)
})

it("exige padre en una lista dependiente", async () => {
  const sinPadre = await llamar("POST", "", { CATEGORIA: "MUNICIPIO", NOMBRE: "Bello", VALOR: "BELLO" })
  expect(sinPadre.status).toBe(400)
})
