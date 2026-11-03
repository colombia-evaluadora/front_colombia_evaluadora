import { http, HttpResponse, delay } from "msw"
import { consumirBorradorActividad } from "@/mocks/handlers/comunicaciones-borradores-actividad"

import type {
  Audiencia,
  Comunicado,
  Conversacion,
  DestinosComunicado,
} from "@/features/comunicaciones/chat/api/types"
import { formatoDeArchivo, validarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { conversaciones, personas, USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import {
  alcanceComunicadoMock,
  opcionesComunicadoMock,
  personaChat,
  personasAlcanceMock,
  puedeCrearComunicadosMock,
} from "@/mocks/db/comunicaciones-seleccion"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { comunicados } from "@/mocks/db/comunicaciones-comunicados"
import { registrarArchivoMaterial } from "@/mocks/db/planeador"

const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

type OpcionIn = { VALOR?: string; ETIQUETA?: string }

interface CrearComunicadoBody {
  TITULO?: string
  DESCRIPCION?: string
  AUDIENCIA?: Audiencia[]
  DESTINOS?: Partial<Record<"GRADOS" | "GRUPOS" | "ROLES" | "USUARIOS" | "GRUPOS_CHAT" | "SEDES" | "JORNADAS", OpcionIn[]>> & {
    PARA?: DestinosComunicado["para"]
    ESTABLECIMIENTO?: OpcionIn | null
  }
  PUBLICAR_EN?: string
  CONTENIDO_HTML?: string
  IMPORTANTE?: "S" | "N"
  PERMITIR_RESPUESTAS?: "S" | "N"
}

const MAX_ADJUNTOS = 10

// Igual que comms-service: guarda la selección con su etiqueta para "Dirigido a".
function destinosDe(body: CrearComunicadoBody): DestinosComunicado {
  const l = (x?: OpcionIn[]) =>
    (x ?? []).filter((o) => o.VALOR).map((o) => ({ valor: String(o.VALOR), etiqueta: o.ETIQUETA ?? String(o.VALOR) }))
  const d = body.DESTINOS ?? {}
  return {
    grados: l(d.GRADOS),
    grupos: l(d.GRUPOS),
    roles: l(d.ROLES),
    usuarios: l(d.USUARIOS),
    gruposChat: l(d.GRUPOS_CHAT),
    para: d.PARA === "ACUDIENTES" || d.PARA === "AMBOS" ? d.PARA : "ESTUDIANTES",
    establecimiento: l(d.ESTABLECIMIENTO ? [d.ESTABLECIMIENTO] : [])[0] ?? null,
    sedes: l(d.SEDES),
    jornadas: l(d.JORNADAS),
  }
}

const vacios = (d: DestinosComunicado) =>
  d.grados.length + d.grupos.length + d.roles.length + d.usuarios.length + d.gruposChat.length === 0

const claveDestinos = (d: DestinosComunicado | null | undefined) =>
  JSON.stringify(
    d ? [d.grados, d.grupos, d.roles, d.usuarios, d.gruposChat].map((l) => l.map((o) => o.valor).sort()) : [],
  )

function incompleto(body: CrearComunicadoBody) {
  return (
    !body.TITULO?.trim() ||
    (!body.AUDIENCIA?.length && vacios(destinosDe(body))) ||
    !body.PUBLICAR_EN ||
    !body.CONTENIDO_HTML?.trim()
  )
}

const INCOMPLETO = { message: "Completa el título, los destinatarios, la fecha y el contenido." }

// Registro de recepción simulado: en el mock solo hay quien publica, así que la lista sale del
// directorio de personas (unas leídas, otras no).
const recepcionMock = (c: Comunicado) =>
  personas.slice(0, Math.max(1, Math.min(personas.length, c.totalDestinatarios ?? 4))).map((p, i) => ({
    usuarioId: p.id,
    nombre: p.nombre,
    estado: i < (c.leidos ?? 0) ? ("LEIDO" as const) : ("NO_LEIDO" as const),
    entregadoEn: new Date(c.publicarEn) <= new Date() ? c.publicarEn : null,
    vistoEn: i < (c.leidos ?? 0) ? new Date(Date.now() - (i + 1) * 3_600_000).toISOString() : null,
  }))

function buscarComunicado(id: string | readonly string[] | undefined) {
  return comunicados.find((x) => x.conversacionId === Number(id))
}

const SIN_PERMISO = () => HttpResponse.json({ message: "Tu perfil no puede crear comunicados." }, { status: 403 })
const FUERA = () =>
  HttpResponse.json(
    {
      message:
        "Hay destinatarios fuera de tu alcance: solo puedes enviar a tu establecimiento y a lo que está por debajo de tu cargo.",
    },
    { status: 403 },
  )

// Persona del chat de cada cuenta del mock (la docente es Darlene, 2).
const yoDe = (email: string) => (email === "docente@example.com" ? 2 : email === "user@example.com" ? 3 : USUARIO_ACTUAL.id)

/** Grupos, personas o audiencias de funcionarios fuera del alcance de quien publica (403). */
function fueraDeAlcance(roles: readonly string[], email: string, body: CrearComunicadoBody): boolean {
  const a = alcanceComunicadoMock(roles)
  if (a.todos) return false
  const d = body.DESTINOS ?? {}
  const grupos = (d.GRUPOS ?? []).map((o) => Number(o.VALOR))
  const usuarios = (d.USUARIOS ?? []).map((o) => Number(o.VALOR))
  const permitidas = a.funcionarios.length ? null : ["ESTUDIANTES", "PADRES"]
  const alcance = personasAlcanceMock(a, yoDe(email))
  return (
    grupos.some((g) => !a.grupos.includes(g)) ||
    usuarios.some((i) => !alcance.includes(i)) ||
    (!!permitidas && (body.AUDIENCIA ?? []).some((x) => !permitidas.includes(x)))
  )
}

const sinComunicado = () => HttpResponse.json({ message: "Esta conversación no tiene un comunicado." }, { status: 404 })

export const comunicacionesComunicadosHandlers = [
  // "Editar Comunicado": texto, importante y respuestas siempre; destinatarios y fecha mientras siga programado.
  http.patch(URL("conversaciones/:id/comunicado"), async ({ params, request }) => {
    await delay(250)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    const body = (await request.json()) as CrearComunicadoBody
    if (incompleto(body)) return HttpResponse.json(INCOMPLETO, { status: 400 })
    const destinos = destinosDe(body)
    const publicado = new Date(c.publicarEn) <= new Date()
    const cambiaAudiencia =
      [...(body.AUDIENCIA ?? [])].sort().join() !== [...c.audiencia].sort().join() ||
      claveDestinos(destinos) !== claveDestinos(c.destinos)
    const cambiaFecha = new Date(body.PUBLICAR_EN as string).getTime() !== new Date(c.publicarEn).getTime()
    if (publicado && (cambiaAudiencia || cambiaFecha)) {
      return HttpResponse.json(
        {
          message:
            "El comunicado ya se publicó: solo puedes cambiar el título, la descripción, el contenido, la marca de importante y las respuestas.",
        },
        { status: 409 },
      )
    }
    const titulo = (body.TITULO as string).trim()
    Object.assign(c, {
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA ?? [],
      destinos,
      publicarEn: body.PUBLICAR_EN,
      contenidoHtml: body.CONTENIDO_HTML,
      importante: body.IMPORTANTE === "S",
      permiteRespuestas: body.PERMITIR_RESPUESTAS === "S",
    })
    const conv = conversaciones.find((x) => x.id === c.conversacionId)
    if (conv) Object.assign(conv, { nombre: titulo, importante: c.importante })
    // Guardar la edición desde su borrador (?borrador) lo elimina, como comms-service.
    consumirBorradorActividad(request)
    return HttpResponse.json({ rows: [c] })
  }),

  http.get(URL("conversaciones/:id/comunicado/recepcion"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    if (!c.esCreador) {
      return HttpResponse.json({ message: "Solo quien publicó el comunicado ve su recepción." }, { status: 403 })
    }
    return HttpResponse.json({ rows: recepcionMock(c) })
  }),

  http.get(URL("conversaciones/:id/comunicado"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    return HttpResponse.json({ rows: [c] })
  }),

  // Adjunto: el front lo manda como multipart por file-service (campo ADJUNTO). El binario queda
  // como object URL (mismo registro que los materiales del planeador) para ver y descargar.
  http.post(`*/api/files/eval-col/comunicaciones/conversaciones/:id/comunicado/adjuntos`, async ({ params, request }) => {
    await delay(400)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    const archivo = (await request.formData()).get("ADJUNTO")
    if (!(archivo instanceof File)) return HttpResponse.json({ message: "Falta el archivo adjunto." }, { status: 400 })
    const error = validarAdjunto(archivo)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    c.adjuntos = c.adjuntos ?? []
    if (c.adjuntos.length >= MAX_ADJUNTOS) {
      return HttpResponse.json({ message: `Un comunicado admite hasta ${MAX_ADJUNTOS} archivos.` }, { status: 400 })
    }
    const archivoId = registrarArchivoMaterial(archivo)
    c.adjuntos.push({ id: archivoId, archivoId, nombre: archivo.name, formato: formatoDeArchivo(archivo), peso: archivo.size })
    return HttpResponse.json({ rows: [c] })
  }),

  http.patch(URL("conversaciones/:id/comunicado/adjuntos/:adjunto/eliminar"), async ({ params }) => {
    await delay(200)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    c.adjuntos = (c.adjuntos ?? []).filter((a) => a.id !== Number(params.adjunto))
    return HttpResponse.json({ rows: [c] })
  }),

  http.post(URL("conversaciones/:id/comunicado/avisar"), async ({ params }) => {
    await delay(150)
    const c = buscarComunicado(params.id)
    if (!c) return sinComunicado()
    return HttpResponse.json({ rows: [c] })
  }),

  // Selector de destinatarios: solo lo que está en el alcance de quien publica.
  http.get(URL("comunicados/destinos/opciones"), async ({ request }) => {
    await delay(150)
    const u = usuarioDe(request)
    if (!u || !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    const q = new globalThis.URL(request.url).searchParams
    const a = alcanceComunicadoMock(u.roles)
    if (q.get("establecimiento") && !a.todos && q.get("establecimiento") !== "1") return FUERA()
    return HttpResponse.json({
      rows: [opcionesComunicadoMock(a, { establecimiento: q.get("establecimiento") ?? undefined, jornada: q.get("jornada") ?? undefined })],
    })
  }),

  http.get(URL("comunicados/destinos/personas"), async ({ request }) => {
    await delay(150)
    const u = usuarioDe(request)
    if (!u || !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    const q = (new globalThis.URL(request.url).searchParams.get("q") ?? "").toLowerCase()
    const a = alcanceComunicadoMock(u.roles)
    const ids = a.todos ? [...personas.map((p) => p.id)] : personasAlcanceMock(a, yoDe(u.email))
    const filas = ids
      .map((i) => personaChat(i))
      .filter((p): p is NonNullable<typeof p> => !!p && (!q || p.nombre.toLowerCase().includes(q)))
    return HttpResponse.json({ rows: filas })
  }),

  http.post(URL("comunicados"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CrearComunicadoBody
    // Permiso dinámico (menú COMUNICADOS del rol) y alcance jerárquico, como comms-service.
    const u = usuarioDe(request)
    if (u && !puedeCrearComunicadosMock(u.roles)) return SIN_PERMISO()
    if (u && fueraDeAlcance(u.roles, u.email, body)) return FUERA()
    if (incompleto(body)) return HttpResponse.json(INCOMPLETO, { status: 400 })
    const titulo = (body.TITULO as string).trim()
    if (conversaciones.some((c) => c.nombre.toLowerCase() === titulo.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe una conversación llamada ${titulo}.` }, { status: 409 })
    }
    const importante = body.IMPORTANTE === "S"
    const canal: Conversacion = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre: titulo,
      tipo: "CANAL",
      categoria: "ANUNCIO",
      noLeidos: 0,
      actividadAbierta: false,
      esBot: false,
      totalMiembros: 410,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
      creadoPor: "Andrés Gómez",
      esCreador: true,
      importante,
    }
    conversaciones.push(canal)
    consumirBorradorActividad(request)
    comunicados.push({
      conversacionId: canal.id,
      titulo,
      descripcion: body.DESCRIPCION ?? "",
      audiencia: body.AUDIENCIA ?? [],
      destinos: destinosDe(body),
      publicarEn: body.PUBLICAR_EN as string,
      contenidoHtml: body.CONTENIDO_HTML as string,
      publicadoPor: "Andrés Gómez",
      esCreador: true,
      leidos: 0,
      totalDestinatarios: 409,
      importante,
      permiteRespuestas: body.PERMITIR_RESPUESTAS === "S",
      adjuntos: [],
      mensajeId: null,
    })
    return HttpResponse.json({ rows: [canal] })
  }),
]
