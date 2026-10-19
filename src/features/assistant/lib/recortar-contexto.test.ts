import { expect, it } from "vitest"

import type { ContextoUi } from "@/features/assistant/api/types"
import { recortarContexto } from "@/features/assistant/lib/recortar-contexto"

const opciones = Array.from({ length: 50 }, (_, i) => ({ valor: String(i), etiqueta: `Opción ${i}` }))

const contexto: ContextoUi = {
  ruta: "/app/x",
  parametros: { a: "1" },
  formularios: [
    {
      codigo: "funcionario.crear",
      entidad: "",
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", obligatorio: true },
        { nombre: "cargo", etiqueta: "Cargo", tipo: "select", opciones },
      ],
    },
  ],
}

it("no toca un contexto que ya cabe", () => {
  expect(recortarContexto(contexto, 100_000)).toBe(contexto)
})

it("quita primero las opciones de los selects", () => {
  const r = recortarContexto(contexto, 400)
  expect(r.formularios?.[0].campos).toHaveLength(2)
  expect(r.formularios?.[0].campos[1].opciones).toBeUndefined()
  expect(r.parametros).toEqual({ a: "1" })
})

it("deja solo los obligatorios si sigue sin caber", () => {
  const r = recortarContexto(contexto, 120)
  expect(r.parametros).toBeUndefined()
  expect(r.formularios?.[0].campos.map((c) => c.nombre)).toEqual(["nombre"])
})
