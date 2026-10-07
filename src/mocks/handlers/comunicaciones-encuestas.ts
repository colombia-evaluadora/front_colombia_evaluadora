import { http, HttpResponse, delay } from "msw"

import type {
  Conversacion,
  TipoPregunta,
  VisibilidadResultados,
} from "@/features/comunicaciones/chat/api/types"
import { OPCIONES_SI_NO } from "@/features/comunicaciones/chat/lib/encuesta"
import { conversaciones } from "@/mocks/db/comunicaciones"
import { encuestas } from "@/mocks/db/comunicaciones-encuestas"

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
  http.get(URL("conversaciones/:id/encuesta"), async ({ params }) => {
    await delay(200)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Este canal no tiene una encuesta." }, { status: 404 })
    return HttpResponse.json({ rows: [e] })
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
