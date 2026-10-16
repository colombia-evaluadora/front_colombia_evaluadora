import { delay, http, HttpResponse } from "msw"

import type {
  ConversacionDetalle,
  ConversacionResumen,
  MensajeHistorial,
  MensajeRequest,
  RespuestaAgente,
} from "@/features/assistant/api/types"

// Mock del agente de ai-control-service con la forma del contrato real
// (`docs/ai-control-service/contrato-agente.md`): mismas rutas, mismos DTO y
// el mismo SSE (`estado`* + `respuesta` | `error`). Las respuestas se eligen
// por palabras clave para poder ver cada `tipo` en la UI:
//   "cuántos"/"estadística" → DATOS · "crea"/"edita" → CONFIRMACION ·
//   "llévame"/"ir a" → UI (NAVEGAR) · "filtra" → UI (APLICAR_FILTROS) ·
//   "ignora tus instrucciones" → BLOQUEADO · "usuarios"/"permisos" → SIN_PERMISO ·
//   "unidad" sin más datos → PREGUNTA · "error" → evento error 503.

// `*/` para que también matchee en msw/node (tests), donde no hay origen.
const BASE = "*/api/ai/agente"

interface ConversacionMock extends ConversacionResumen {
  mensajes: MensajeHistorial[]
}

interface AccionMock {
  id: string
  conversacionId: string
  resumen: string
  expira: Date
  estado: "PENDIENTE" | "EJECUTADA" | "DESCARTADA"
}

export const conversacionesMock = new Map<string, ConversacionMock>()
export const accionesMock = new Map<string, AccionMock>()
let mensajeId = 1

const ahora = () => new Date().toISOString().slice(0, 19)

function agregarMensaje(c: ConversacionMock, rol: MensajeHistorial["rol"], texto: string, tipo?: RespuestaAgente["tipo"]) {
  c.mensajes.push({
    id: mensajeId++,
    secuencia: c.mensajes.length + 1,
    rol,
    texto,
    ...(tipo ? { tipoRespuesta: tipo } : {}),
    createdAt: ahora(),
  })
  c.ultimoMensajeAt = ahora()
  if (!c.titulo && rol === "USER") c.titulo = texto.slice(0, 60)
}

function resumen({ mensajes: _m, ...c }: ConversacionMock): ConversacionResumen {
  return c
}

export function responderMock(conversacionId: string, { texto, contextoUi }: MensajeRequest): RespuestaAgente {
  const t = texto.toLowerCase()
  if (/ignora (tus|las) instrucciones/.test(t)) {
    return { tipo: "BLOQUEADO", texto: "No puedo procesar ese mensaje." }
  }
  if (/usuarios|permisos|contraseña/.test(t)) {
    return { tipo: "SIN_PERMISO", texto: "La gestión de usuarios y permisos no está disponible desde el asistente." }
  }
  if (/cu[aá]nt|estad[ií]stica/.test(t)) {
    return {
      tipo: "DATOS",
      texto: "Estas son tus actividades por estado en el periodo actual:",
      datos: {
        columnas: ["estado", "total"],
        filas: [
          { estado: "Pendiente", total: 3 },
          { estado: "Calificada", total: 8 },
          { estado: "Aprobada", total: 5 },
        ],
      },
    }
  }
  if (/ll[eé]vame|ir a|d[oó]nde/.test(t)) {
    return {
      tipo: "UI",
      texto: "Te llevo al **Planeador** › Actividades.",
      acciones: [{ op: "NAVEGAR", pantalla: "planeador", url: "/app/planeador/actividades", params: {} }],
    }
  }
  if (/filtra/.test(t)) {
    const filtro = contextoUi?.filtros?.[0]
    if (!filtro) return { tipo: "RESPUESTA", texto: "Esta pantalla no tiene filtros que pueda aplicar." }
    return { tipo: "UI", texto: `Apliqué el filtro **${filtro}**.`, acciones: [{ op: "APLICAR_FILTROS", filtros: { [filtro]: "1" } }] }
  }
  if (/unidad/.test(t) && !/llamada|titulada/.test(t)) {
    return {
      tipo: "PREGUNTA",
      texto: "Para crear la unidad necesito un dato más:",
      faltantes: [
        {
          campo: "FK_TLV_CALCULO_DEFINITIVA",
          pregunta: "¿Cómo se calcula la nota de la unidad?",
          opciones: ["Ponderado", "Promedio simple", "Suma de puntos"],
        },
      ],
    }
  }
  if (/crea|edita|registra|califica/.test(t)) {
    const accion: AccionMock = {
      id: crypto.randomUUID(),
      conversacionId,
      resumen: `Crear actividad en el planeador: "${texto.slice(0, 80)}".`,
      expira: new Date(Date.now() + 10 * 60_000),
      estado: "PENDIENTE",
    }
    accionesMock.set(accion.id, accion)
    return {
      tipo: "CONFIRMACION",
      texto: "Preparé la acción. Revísala y confírmala para ejecutarla.",
      accionPendiente: { id: accion.id, resumen: accion.resumen, expira: accion.expira.toISOString().slice(0, 19) },
    }
  }
  return {
    tipo: "RESPUESTA",
    texto:
      "Puedo ayudarte a:\n\n- Consultar tus **actividades**, unidades y periodos\n- Llevarte a la pantalla correcta\n- Preparar cambios en el planeador que tú confirmas\n\n_Estás en_ `" +
      (contextoUi?.ruta ?? "/app") +
      "`.",
  }
}

function sse(eventos: { evento: string; datos: unknown; espera?: number }[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const { evento, datos, espera } of eventos) {
        if (espera) await delay(espera)
        controller.enqueue(encoder.encode(`event:${evento}\ndata:${JSON.stringify(datos)}\n\n`))
      }
      controller.close()
    },
  })
  return new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } })
}

function noEncontrada(mensaje = "La conversación no existe.") {
  return HttpResponse.json({ mensaje }, { status: 404 })
}

function turno(id: string, body: MensajeRequest): RespuestaAgente | Response {
  const c = conversacionesMock.get(id)
  if (!c) return noEncontrada()
  if (c.estado === "ARCHIVADA") {
    return HttpResponse.json({ mensaje: "La conversación está archivada. Crea una nueva para seguir." }, { status: 409 })
  }
  if (!body?.texto?.trim()) return HttpResponse.json({ mensaje: "El mensaje no es válido." }, { status: 400 })
  if (body.texto.length > 4000) {
    return HttpResponse.json({ mensaje: "El mensaje supera el máximo de 4000 caracteres." }, { status: 400 })
  }
  agregarMensaje(c, "USER", body.texto)
  const respuesta = responderMock(id, body)
  agregarMensaje(c, "ASSISTANT", respuesta.texto ?? "", respuesta.tipo)
  return respuesta
}

export const agenteHandlers = [
  http.post(`${BASE}/conversaciones`, async () => {
    await delay(150)
    const id = crypto.randomUUID()
    conversacionesMock.set(id, {
      id,
      titulo: null,
      estado: "ACTIVA",
      ultimoMensajeAt: null,
      createdAt: ahora(),
      mensajes: [],
    })
    return HttpResponse.json({ conversationId: id }, { status: 201 })
  }),

  http.get(`${BASE}/conversaciones`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const page = Math.max(Number(url.searchParams.get("page") ?? 0), 0)
    const size = Math.min(Math.max(Number(url.searchParams.get("size") ?? 20), 1), 50)
    const lista = [...conversacionesMock.values()]
      .filter((c) => c.estado !== "ARCHIVADA")
      .sort((a, b) => (b.ultimoMensajeAt ?? b.createdAt).localeCompare(a.ultimoMensajeAt ?? a.createdAt))
      .slice(page * size, page * size + size)
      .map(resumen)
    return HttpResponse.json(lista)
  }),

  http.get(`${BASE}/conversaciones/:id`, async ({ params }) => {
    await delay(200)
    const c = conversacionesMock.get(String(params.id))
    if (!c) return noEncontrada()
    const detalle: ConversacionDetalle = { conversacion: resumen(c), mensajes: c.mensajes }
    return HttpResponse.json(detalle)
  }),

  http.put(`${BASE}/conversaciones/:id/archivar`, async ({ params }) => {
    await delay(150)
    const c = conversacionesMock.get(String(params.id))
    if (!c) return noEncontrada()
    c.estado = "ARCHIVADA"
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/conversaciones/:id/mensajes/stream`, async ({ params, request }) => {
    const body = (await request.json()) as MensajeRequest
    if (/\berror\b/i.test(body?.texto ?? "")) {
      return sse([
        { evento: "estado", datos: { estado: "VALIDADO" }, espera: 200 },
        { evento: "error", datos: { status: 503, mensaje: "El proveedor de IA no está disponible." }, espera: 400 },
      ])
    }
    const resultado = turno(String(params.id), body)
    if (resultado instanceof Response) return resultado
    return sse([
      { evento: "estado", datos: { estado: "VALIDADO" }, espera: 150 },
      { evento: "estado", datos: { estado: "INTENCION" }, espera: 400 },
      { evento: "estado", datos: { estado: "PERMISO_OK" }, espera: 300 },
      { evento: "estado", datos: { estado: "RECOLECTANDO" }, espera: 300 },
      { evento: "respuesta", datos: resultado, espera: 700 },
    ])
  }),

  http.post(`${BASE}/conversaciones/:id/mensajes`, async ({ params, request }) => {
    await delay(800)
    const resultado = turno(String(params.id), (await request.json()) as MensajeRequest)
    return resultado instanceof Response ? resultado : HttpResponse.json(resultado)
  }),

  http.post(`${BASE}/acciones/:id/:decision`, async ({ params }) => {
    await delay(500)
    const accion = accionesMock.get(String(params.id))
    if (!accion) return HttpResponse.json({ mensaje: "La acción no existe." }, { status: 404 })
    if (accion.estado !== "PENDIENTE") {
      return HttpResponse.json(
        { mensaje: "La acción ya no está pendiente: se resolvió o se está ejecutando." },
        { status: 409 },
      )
    }
    if (accion.expira.getTime() < Date.now()) {
      return HttpResponse.json({ mensaje: "La acción expiró. Vuelve a pedirla." }, { status: 410 })
    }
    const confirmar = params.decision === "confirmar"
    accion.estado = confirmar ? "EJECUTADA" : "DESCARTADA"
    const respuesta: RespuestaAgente = {
      tipo: "RESPUESTA",
      texto: confirmar ? "Hecho. La actividad quedó creada." : "Listo, descarté la acción.",
    }
    const c = conversacionesMock.get(accion.conversacionId)
    if (c) agregarMensaje(c, "ASSISTANT", respuesta.texto!, respuesta.tipo)
    return HttpResponse.json(respuesta)
  }),
]
