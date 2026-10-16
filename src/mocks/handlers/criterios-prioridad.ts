import { http, HttpResponse, delay } from "msw"

import {
  camposDb,
  criteriosDb,
  enUsoDb,
  reglasDb,
  reglasDe,
  toCriterio,
  type CriterioMock,
} from "@/mocks/db/criterios-prioridad"
import { nextId } from "@/mocks/db/next-id"

// Misma forma que el back real: `{ rows: [{ resultado }] }`, y los mismos
// errores (409 nombre repetido / en uso, 400 regla que no aplica).
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

interface Body {
  NOMBRE?: string
  DESCRIPCION?: string | null
  CAMPO?: number
  REGLA?: number
  VALORES?: number[]
  HABILITADO?: boolean
}

function validar(body: Body, pkExcluir?: number): string | null {
  const nombre = body.NOMBRE?.trim() ?? ""
  if (nombre.length < 4 || nombre.length > 80) return "El nombre del criterio debe tener entre 4 y 80 caracteres."
  if (criteriosDb.some((c) => c.pkCriterio !== pkExcluir && c.nombre.toLowerCase() === nombre.toLowerCase()))
    return "El nombre ya existe en otro criterio de prioridad."
  const campo = camposDb.find((c) => c.pkCampo === body.CAMPO)
  if (!campo) return "Seleccione el campo que evalúa el criterio."
  const regla = reglasDe(campo).find((r) => r.pkRegla === body.REGLA)
  if (!regla) return "Seleccione una regla de prioridad válida."
  if (regla.motivo) return regla.motivo
  if (regla.codigo === "ES_UNO_DE" && !body.VALORES?.length) return "Seleccione al menos un valor."
  return null
}

export const criteriosPrioridadHandlers = [
  http.get("/api/eval-col/criterios-prioridad", async () => {
    await delay(200)
    return resultado([...criteriosDb].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map(toCriterio))
  }),

  http.get("/api/eval-col/catalogos/criterios-prioridad/campos", async () => {
    await delay(200)
    const bloques = [...new Map(camposDb.map((c) => [c.bloque.codigo, c.bloque])).values()]
    return resultado(
      bloques.map((b) => ({
        ...b,
        campos: camposDb
          .filter((c) => c.bloque.codigo === b.codigo)
          .map(({ bloque: _b, orden: _o, ...c }) => ({ ...c, reglas: reglasDe({ ...c, bloque: _b, orden: _o }) })),
      })),
    )
  }),

  http.post("/api/eval-col/criterios-prioridad", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Body
    const fallo = validar(body)
    if (fallo) return error(fallo.includes("ya existe") ? 409 : 400, fallo)
    const nuevo: CriterioMock = {
      pkCriterio: nextId(criteriosDb.map((c) => c.pkCriterio)),
      nombre: body.NOMBRE!.trim(),
      descripcion: body.DESCRIPCION?.trim() || null,
      habilitado: body.HABILITADO ?? true,
      pkCampo: body.CAMPO!,
      pkRegla: body.REGLA!,
      valores: body.VALORES ?? [],
    }
    criteriosDb.push(nuevo)
    return resultado(toCriterio(nuevo))
  }),

  http.put("/api/eval-col/criterios-prioridad/:id/estado", async ({ params, request }) => {
    await delay(200)
    const criterio = criteriosDb.find((c) => c.pkCriterio === Number(params.id))
    if (!criterio) return error(404, "No existe el criterio de prioridad solicitado.")
    criterio.habilitado = Boolean(((await request.json()) as Body).HABILITADO)
    return resultado(toCriterio(criterio))
  }),

  http.put("/api/eval-col/criterios-prioridad/:id/eliminar", async ({ params }) => {
    await delay(200)
    const i = criteriosDb.findIndex((c) => c.pkCriterio === Number(params.id))
    if (i < 0) return error(404, "No existe el criterio de prioridad solicitado.")
    if (enUsoDb.has(criteriosDb[i].pkCriterio)) return error(409, "Este criterio está en uso: solo se puede desactivar.")
    const [eliminado] = criteriosDb.splice(i, 1)
    return resultado(toCriterio(eliminado))
  }),

  http.put("/api/eval-col/criterios-prioridad/:id", async ({ params, request }) => {
    await delay(300)
    const criterio = criteriosDb.find((c) => c.pkCriterio === Number(params.id))
    if (!criterio) return error(404, "No existe el criterio de prioridad solicitado.")
    if (enUsoDb.has(criterio.pkCriterio)) return error(409, "Este criterio está en uso: solo se puede desactivar.")
    const body = (await request.json()) as Body
    const fallo = validar(body, criterio.pkCriterio)
    if (fallo) return error(fallo.includes("ya existe") ? 409 : 400, fallo)
    const esUnoDe = reglasDb.find((r) => r.pkRegla === body.REGLA)?.codigo === "ES_UNO_DE"
    Object.assign(criterio, {
      nombre: body.NOMBRE!.trim(),
      descripcion: body.DESCRIPCION?.trim() || null,
      pkCampo: body.CAMPO!,
      pkRegla: body.REGLA!,
      valores: esUnoDe ? (body.VALORES ?? []) : [],
    })
    return resultado(toCriterio(criterio))
  }),
]
