import { http, HttpResponse, delay } from "msw"

import type {
  BorradorActividad,
  TipoBorradorActividad,
} from "@/features/comunicaciones/chat/api/types"
import {
  MAX_DATOS_BORRADOR,
  MAX_TITULO_BORRADOR,
  bytesDatos,
} from "@/features/comunicaciones/chat/lib/borrador-actividad"

/**
 * Borradores de comunicados, encuestas, elecciones y evaluaciones (comms-service,
 * `comunicaciones.tborrador_actividad`). En memoria: recargar los borra. El mock tiene un solo
 * usuario del chat, así que no filtra por autor.
 */

// `*` delante: también matchea con `msw/node` en los tests (URL absoluta).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`
const TIPOS: TipoBorradorActividad[] = ["COMUNICADO", "ENCUESTA", "ELECCION", "EVALUACION"]
const MAX_BORRADORES = 100

export const borradoresActividad: BorradorActividad[] = []

const resumen = (b: BorradorActividad): BorradorActividad => ({ ...b, datos: null })
const noExiste = () => HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })

/** `?borrador=<id>` al publicar: la actividad salió de ese borrador y se elimina. */
export function consumirBorradorActividad(request: Request) {
  const id = Number(new globalThis.URL(request.url).searchParams.get("borrador"))
  if (!id) return
  const i = borradoresActividad.findIndex((b) => b.id === id)
  if (i !== -1) borradoresActividad.splice(i, 1)
}

interface BorradorBody {
  TIPO?: string
  TITULO?: string
  DATOS?: unknown
  FK_TCANAL?: number | null
}

function validarDatos(datos: unknown) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return HttpResponse.json({ message: "El borrador no es válido." }, { status: 400 })
  }
  if (bytesDatos(datos) > MAX_DATOS_BORRADOR) {
    return HttpResponse.json({ message: "El borrador es demasiado grande." }, { status: 400 })
  }
  return null
}

export const comunicacionesBorradoresActividadHandlers = [
  http.get(URL("borradores-actividad"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: borradoresActividad.map(resumen) })
  }),

  http.get(URL("borradores-actividad/:id"), async ({ params }) => {
    await delay(150)
    const b = borradoresActividad.find((x) => x.id === Number(params.id))
    return b ? HttpResponse.json({ rows: [b] }) : noExiste()
  }),

  http.post(URL("borradores-actividad"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as BorradorBody
    const tipo = TIPOS.find((t) => t === body.TIPO)
    if (!tipo)
      return HttpResponse.json({ message: "Tipo de actividad desconocido." }, { status: 400 })
    const invalido = validarDatos(body.DATOS)
    if (invalido) return invalido
    const ahora = new Date().toISOString()
    const titulo = (body.TITULO ?? "").trim().slice(0, MAX_TITULO_BORRADOR)
    const conversacionId = body.FK_TCANAL ?? null
    // Con canal (editar una actividad publicada) hay un solo borrador vivo: se reemplaza.
    const previo = conversacionId
      ? borradoresActividad.find((b) => b.conversacionId === conversacionId)
      : undefined
    if (previo) {
      Object.assign(previo, { titulo, datos: body.DATOS as Record<string, unknown>, fecha: ahora })
      return HttpResponse.json({ rows: [resumen(previo)] })
    }
    if (borradoresActividad.length >= MAX_BORRADORES) {
      return HttpResponse.json(
        { message: `Ya tienes ${MAX_BORRADORES} borradores de actividades: elimina alguno.` },
        { status: 409 },
      )
    }
    const b: BorradorActividad = {
      id: Math.max(0, ...borradoresActividad.map((x) => x.id)) + 1,
      tipo,
      titulo,
      conversacionId,
      datos: body.DATOS as Record<string, unknown>,
      fecha: ahora,
      creado: ahora,
    }
    borradoresActividad.push(b)
    return HttpResponse.json({ rows: [resumen(b)] })
  }),

  http.put(URL("borradores-actividad/:id"), async ({ params, request }) => {
    await delay(120)
    const b = borradoresActividad.find((x) => x.id === Number(params.id))
    if (!b) return noExiste()
    const body = (await request.json()) as BorradorBody
    const invalido = validarDatos(body.DATOS)
    if (invalido) return invalido
    Object.assign(b, {
      titulo: (body.TITULO ?? "").trim().slice(0, MAX_TITULO_BORRADOR),
      datos: body.DATOS as Record<string, unknown>,
      fecha: new Date().toISOString(),
    })
    return HttpResponse.json({ rows: [resumen(b)] })
  }),

  http.patch(URL("borradores-actividad/:id/eliminar"), async ({ params }) => {
    await delay(120)
    const i = borradoresActividad.findIndex((x) => x.id === Number(params.id))
    if (i === -1) return noExiste()
    const [b] = borradoresActividad.splice(i, 1)
    return HttpResponse.json({ rows: [resumen(b)] })
  }),
]
