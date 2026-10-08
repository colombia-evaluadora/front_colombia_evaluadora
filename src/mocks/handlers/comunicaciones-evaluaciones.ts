import { http, HttpResponse, delay } from "msw"

import type {
  Conversacion,
  Evaluacion,
  EntregaEvaluacion,
  MostrarResultados,
  TipoPregunta,
} from "@/features/comunicaciones/chat/api/types"
import { conversaciones } from "@/mocks/db/comunicaciones"
import { entregas, evaluaciones } from "@/mocks/db/comunicaciones-evaluaciones"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import { esAutomatica, notaEntrega } from "@/features/comunicaciones/chat/lib/evaluacion"

// Lo que ve el estudiante: sin las respuestas correctas y con su propio avance.
function vistaEstudiante(e: Evaluacion, nombre: string): Evaluacion {
  const mias = (entregas.get(e.conversacionId) ?? []).filter((x) => x.estudiante === nombre)
  const ultima = mias.at(-1)
  const visible = e.mostrarResultados === "INMEDIATO" || estadoEleccion(e) === "FINALIZADA"
  return {
    ...e,
    esCreador: false,
    preguntas: e.preguntas.map((p) => ({ ...p, opciones: p.opciones.map((o) => ({ ...o, correcta: false })) })),
    intentosUsados: mias.length,
    miNota: ultima && visible ? notaEntrega(e, ultima) : null,
    miNotaPendiente: ultima?.estado === "PENDIENTE",
  }
}

let siguienteId = 1000

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

interface CrearEvaluacionBody {
  NOMBRE?: string
  DESCRIPCION?: string
  FECHA_INICIO?: string | null
  FECHA_CIERRE?: string | null
  TIEMPO_LIMITE_MIN?: number | null
  PUNTAJE_TOTAL?: number
  INTENTOS?: number | null
  MOSTRAR_RESULTADOS?: MostrarResultados
  PREGUNTAS?: Array<{
    TIPO: TipoPregunta
    TEXTO: string
    PUNTOS: number
    OPCIONES: Array<{ TEXTO: string; CORRECTA: "S" | "N" }>
  }>
}


export const comunicacionesEvaluacionesHandlers = [
  http.get(URL("conversaciones/:id/evaluacion/entregas"), async ({ params }) => {
    await delay(250)
    return HttpResponse.json({ rows: entregas.get(Number(params.id)) ?? [] })
  }),

  http.post(URL("conversaciones/:id/evaluacion/entregas"), async ({ params, request }) => {
    await delay(300)
    const e = evaluaciones.find((x) => x.conversacionId === Number(params.id))
    const user = usuarioDe(request)
    if (!e || !user) {
      return HttpResponse.json({ message: "Este canal no tiene una evaluación." }, { status: 404 })
    }
    if (estadoEleccion(e) !== "ACTIVA") {
      return HttpResponse.json({ message: "La evaluación no está abierta." }, { status: 409 })
    }
    const lista = entregas.get(e.conversacionId) ?? []
    const usados = lista.filter((x) => x.estudiante === user.name).length
    if (e.intentos != null && usados >= e.intentos) {
      return HttpResponse.json({ message: "Ya usaste todos tus intentos." }, { status: 409 })
    }
    const body = (await request.json()) as {
      RESPUESTAS: Array<{ FK_PREGUNTA: number; OPCIONES: number[]; TEXTO: string | null }>
    }
    const conRedaccion = e.preguntas.some((p) => !esAutomatica(p))
    const nueva: EntregaEvaluacion = {
      id: ++siguienteId,
      estudiante: user.name,
      estado: conRedaccion ? "PENDIENTE" : "CALIFICADA",
      respuestas: body.RESPUESTAS.map((r) => ({
        preguntaId: r.FK_PREGUNTA,
        opcionIds: r.OPCIONES,
        texto: r.TEXTO,
        puntos: null,
      })),
    }
    lista.push(nueva)
    entregas.set(e.conversacionId, lista)
    return HttpResponse.json({ rows: [vistaEstudiante(e, user.name)] })
  }),

  http.get(URL("conversaciones/:id/evaluacion"), async ({ params, request }) => {
    await delay(200)
    const e = evaluaciones.find((x) => x.conversacionId === Number(params.id))
    if (!e) {
      return HttpResponse.json({ message: "Este canal no tiene una evaluación." }, { status: 404 })
    }
    const user = usuarioDe(request)
    if (user?.roles.includes("CEVAL-ESTUDIANTE")) {
      return HttpResponse.json({ rows: [vistaEstudiante(e, user.name)] })
    }
    return HttpResponse.json({ rows: [e] })
  }),

  http.patch(URL("evaluaciones/entregas/:id"), async ({ params, request }) => {
    await delay(300)
    const body = (await request.json()) as {
      CALIFICACIONES?: Array<{ FK_PREGUNTA: number; PUNTOS: number }>
    }
    const entrega = [...entregas.values()].flat().find((x) => x.id === Number(params.id))
    if (!entrega) return HttpResponse.json({ message: "La entrega no existe." }, { status: 404 })
    for (const c of body.CALIFICACIONES ?? []) {
      const r = entrega.respuestas.find((x) => x.preguntaId === c.FK_PREGUNTA)
      if (r) r.puntos = c.PUNTOS
    }
    entrega.estado = "CALIFICADA"
    return HttpResponse.json({ rows: [entrega] })
  }),

  http.post(URL("evaluaciones"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearEvaluacionBody
    const nombre = body.NOMBRE?.trim()
    const preguntas = body.PREGUNTAS ?? []
    if (!nombre || preguntas.length === 0) {
      return HttpResponse.json({ message: "Completa el nombre y agrega preguntas." }, { status: 400 })
    }
    const suma = preguntas.reduce((s, p) => s + p.PUNTOS, 0)
    if (suma !== body.PUNTAJE_TOTAL) {
      return HttpResponse.json(
        { message: `Las preguntas suman ${suma} y el puntaje total es ${body.PUNTAJE_TOTAL}.` },
        { status: 400 },
      )
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un canal llamado ${nombre}.` }, { status: 409 })
    }
    const canal: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre,
      tipo: "CANAL",
      categoria: "EXAMEN",
      noLeidos: 0,
      actividadAbierta: true,
      esBot: false,
      totalMiembros: 35,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
    }
    conversaciones.push(canal)
    evaluaciones.push({
      conversacionId: canal.id,
      nombre,
      descripcion: body.DESCRIPCION ?? "",
      fechaInicio: body.FECHA_INICIO ?? null,
      fechaCierre: body.FECHA_CIERRE ?? null,
      tiempoLimiteMin: body.TIEMPO_LIMITE_MIN ?? null,
      puntajeTotal: body.PUNTAJE_TOTAL ?? 0,
      intentos: body.INTENTOS ?? null,
      mostrarResultados: body.MOSTRAR_RESULTADOS ?? "AL_CIERRE",
      creadoPor: "Andrés Gómez",
      esCreador: true,
      intentosUsados: 0,
      miNota: null,
      miNotaPendiente: false,
      preguntas: preguntas.map((p) => ({
        id: siguienteId++,
        tipo: p.TIPO,
        texto: p.TEXTO,
        puntos: p.PUNTOS,
        opciones: p.OPCIONES.map((o) => ({
          id: siguienteId++,
          texto: o.TEXTO,
          correcta: o.CORRECTA === "S",
        })),
      })),
    })
    entregas.set(canal.id, [])
    return HttpResponse.json({ rows: [canal] })
  }),
]
