import { http, HttpResponse, delay } from "msw"

import type {
  Conversacion,
  Encuesta,
  TipoPregunta,
  VisibilidadResultados,
} from "@/features/comunicaciones/chat/api/types"
import { OPCIONES_SI_NO } from "@/features/comunicaciones/chat/lib/encuesta"
import { conversaciones } from "@/mocks/db/comunicaciones"
import { encuestas, respondieron } from "@/mocks/db/comunicaciones-encuestas"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"

// En la demo la crea el administrador; el resto son las personas asignadas que la responden.
function vistaDe(e: Encuesta, request: Request): Encuesta {
  const user = usuarioDe(request)
  return {
    ...e,
    esCreador: e.esCreador && user?.role === "ADMIN",
    yaRespondi: !!user && (respondieron.get(e.conversacionId)?.has(user.email) ?? false),
  }
}

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

interface CrearEncuestaBody {
  NOMBRE?: string
  DESCRIPCION?: string
  FECHA_INICIO?: string | null
  FECHA_CIERRE?: string | null
  RESULTADOS?: VisibilidadResultados
  PREGUNTAS?: Array<{ ORDEN: number; TIPO: TipoPregunta; TEXTO: string; OPCIONES: string[] }>
}

let siguienteId = 100

export const comunicacionesEncuestasHandlers = [
  http.get(URL("conversaciones/:id/encuesta"), async ({ params, request }) => {
    await delay(200)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una encuesta." }, { status: 404 })
    return HttpResponse.json({ rows: [vistaDe(e, request)] })
  }),

  http.post(URL("conversaciones/:id/encuesta/respuestas"), async ({ params, request }) => {
    await delay(300)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    const user = usuarioDe(request)
    if (!e || !user) return HttpResponse.json({ message: "Este canal no tiene una encuesta." }, { status: 404 })
    if (estadoEleccion(e) !== "ACTIVA") {
      return HttpResponse.json({ message: "La encuesta no está abierta." }, { status: 409 })
    }
    const lista = respondieron.get(e.conversacionId) ?? new Set<string>()
    if (lista.has(user.email)) return HttpResponse.json({ message: "Ya respondiste esta encuesta." }, { status: 409 })
    const body = (await request.json()) as {
      RESPUESTAS: Array<{ FK_PREGUNTA: number; OPCIONES: number[]; TEXTO: string | null }>
    }
    for (const r of body.RESPUESTAS) {
      const p = e.preguntas.find((x) => x.id === r.FK_PREGUNTA)
      if (!p) continue
      const contesto = p.tipo === "REDACCION" ? !!r.TEXTO?.trim() : r.OPCIONES.length > 0
      if (!contesto) continue
      p.totalRespuestas += 1
      for (const o of p.opciones) if (r.OPCIONES.includes(o.id)) o.votos += 1
      if (r.TEXTO?.trim()) p.respuestas.unshift(r.TEXTO.trim())
    }
    e.participantes += 1
    lista.add(user.email)
    respondieron.set(e.conversacionId, lista)
    return HttpResponse.json({ rows: [vistaDe(e, request)] })
  }),

  http.post(URL("encuestas"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearEncuestaBody
    const nombre = body.NOMBRE?.trim()
    const preguntas = body.PREGUNTAS ?? []
    if (!nombre) return HttpResponse.json({ message: "Escribe el nombre de la encuesta." }, { status: 400 })
    if (preguntas.length === 0) {
      return HttpResponse.json({ message: "Agrega al menos una pregunta." }, { status: 400 })
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un canal llamado ${nombre}.` }, { status: 409 })
    }
    const canal: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre,
      tipo: "CANAL",
      categoria: "ENCUESTA",
      noLeidos: 0,
      actividadAbierta: true,
      esBot: false,
      totalMiembros: 300,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
    }
    conversaciones.push(canal)
    encuestas.push({
      conversacionId: canal.id,
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      resultados: body.RESULTADOS ?? "PUBLICOS",
      totalHabilitados: 300,
      participantes: 0,
      creadoPor: "Andrés Gómez",
      esCreador: true,
      yaRespondi: false,
      preguntas: preguntas.map((p) => ({
        id: siguienteId++,
        tipo: p.TIPO,
        texto: p.TEXTO,
        totalRespuestas: 0,
        respuestas: [],
        opciones: (p.TIPO === "SI_NO" ? OPCIONES_SI_NO : p.OPCIONES).map((texto) => ({
          id: siguienteId++,
          texto,
          votos: 0,
        })),
      })),
    })
    return HttpResponse.json({ rows: [canal] })
  }),
]
