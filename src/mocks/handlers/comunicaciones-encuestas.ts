import { http, HttpResponse, delay } from "msw"
import { consumirBorradorActividad } from "@/mocks/handlers/comunicaciones-borradores-actividad"

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
import { notificarActividad, notificarResultados } from "@/mocks/db/comunicaciones-notificaciones-puente"

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
  PARTICIPANTES?: number[]
  PREGUNTAS?: Array<{ ORDEN: number; TIPO: TipoPregunta; TEXTO: string; OPCIONES: string[] }>
}

let siguienteId = 100

export const comunicacionesEncuestasHandlers = [
  // "Editar Encuesta": como comms-service, solo mientras nadie la haya respondido.
  http.patch(URL("conversaciones/:id/encuesta"), async ({ params, request }) => {
    await delay(250)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Esta conversación no tiene una encuesta." }, { status: 404 })
    if (usuarioDe(request)?.role !== "ADMIN") {
      return HttpResponse.json({ message: "Solo quien creó la encuesta puede editarla." }, { status: 403 })
    }
    if (e.participantes > 0) return HttpResponse.json({ message: "La encuesta ya tiene respuestas: no se puede editar." }, { status: 409 })
    const body = (await request.json()) as CrearEncuestaBody
    const nombre = body.NOMBRE?.trim()
    if (!nombre || !body.PREGUNTAS?.length) {
      return HttpResponse.json({ message: "Completa el nombre y agrega preguntas." }, { status: 400 })
    }
    Object.assign(e, {
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      resultados: body.RESULTADOS ?? "PUBLICOS",
      preguntas: body.PREGUNTAS.map((p) => ({
        id: siguienteId++,
        tipo: p.TIPO,
        texto: p.TEXTO,
        totalRespuestas: 0,
        respuestas: [],
        opciones: (p.TIPO === "SI_NO" ? OPCIONES_SI_NO : p.OPCIONES).map((texto) => ({ id: siguienteId++, texto, votos: 0 })),
      })),
    })
    const conv = conversaciones.find((c) => c.id === e.conversacionId)
    if (conv) conv.nombre = nombre
    // Guardar la edición desde su borrador (?borrador) lo elimina, como comms-service.
    consumirBorradorActividad(request)
    return HttpResponse.json({ rows: [vistaDe(e, request)] })
  }),

  http.get(URL("conversaciones/:id/encuesta"), async ({ params, request }) => {
    await delay(200)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    if (!e) return HttpResponse.json({ message: "Esta conversación no tiene una encuesta." }, { status: 404 })
    // Cerró por fecha: el aviso de resultados sale una vez (comms-service lo revisa con su job).
    if (e.fechaCierre && Date.parse(e.fechaCierre) <= Date.now()) notificarResultados(e.conversacionId, "ENCUESTA", e.nombre)
    return HttpResponse.json({ rows: [vistaDe(e, request)] })
  }),

  http.post(URL("conversaciones/:id/encuesta/respuestas"), async ({ params, request }) => {
    await delay(300)
    const e = encuestas.find((x) => x.conversacionId === Number(params.id))
    const user = usuarioDe(request)
    if (!e || !user) return HttpResponse.json({ message: "Esta conversación no tiene una encuesta." }, { status: 404 })
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
      return HttpResponse.json({ message: `Ya existe una conversación llamada ${nombre}.` }, { status: 409 })
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
      creadoPor: "Andrés Gómez",
      esCreador: true,
    }
    conversaciones.push(canal)
    consumirBorradorActividad(request)
    // Aviso a quienes la responden (comms-service: CHAT_ENCUESTA al abrir).
    notificarActividad(canal.id, "CHAT_ENCUESTA", `Encuesta abierta: ${nombre}`, "Abre la encuesta y respóndela.")
    encuestas.push({
      conversacionId: canal.id,
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      resultados: body.RESULTADOS ?? "PUBLICOS",
      totalHabilitados: body.PARTICIPANTES?.length || 300,
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
