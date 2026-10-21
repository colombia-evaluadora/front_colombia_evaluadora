import { delay, http, HttpResponse } from "msw"

import type { Conversacion, Mensaje, Miembro } from "@/features/comunicaciones/chat/api/types"
import { conversaciones, mensajes, nuevoMensaje, personas, politicaChat, USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import { notificacionesDb } from "@/mocks/db/notificaciones"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { publish } from "@/mocks/realtime/server"

/**
 * Grupos del chat (`TIPO: "GRUPO"`) con varias personas reales, como comms-service: cada
 * request se atiende como quien trae el token. Así un e2e con MSW entra como admin, docente y
 * user (mismo navegador, sin recargar) y ve la misma conversación desde cada lado.
 *
 * Reglas (PENDIENTE DE CONFIRMAR CON NATALIA, igual que `comms.politica.grupos`): quien crea
 * administra; los administradores añaden, quitan y nombran administradores; cualquiera sale; si
 * sale el último administrador, lo hereda el miembro más antiguo. Cada mensaje deja a los demás
 * un aviso CHAT_MENSAJE agrupado por conversación (uno vivo que suma el conteo).
 *
 * Lo que no es de un grupo cae al handler siguiente (`comunicaciones.ts`): devolver `undefined`.
 */

const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`

/** Correo de las cuentas del mock → persona del chat. */
const PERSONA_DE_CORREO: Record<string, number> = {
  "admin@example.com": USUARIO_ACTUAL.id,
  "docente@example.com": 2,
  "user@example.com": 3,
}

interface MiembroGrupo {
  id: number
  nombre: string
  admin: boolean
  desde: number
  silenciado: boolean
}

let reloj = 0
export const miembrosGrupo = new Map<number, MiembroGrupo[]>()

function personaDe(request: Request) {
  const id = PERSONA_DE_CORREO[usuarioDe(request)?.email ?? ""] ?? USUARIO_ACTUAL.id
  const nombre = id === USUARIO_ACTUAL.id ? USUARIO_ACTUAL.nombre : personas.find((p) => p.id === id)?.nombre ?? "?"
  return { id, nombre }
}

function correoDe(personaId: number) {
  return Object.entries(PERSONA_DE_CORREO).find(([, id]) => id === personaId)?.[0]
}

const grupo = (id: unknown) => conversaciones.find((c) => c.id === Number(id) && c.tipo === "GRUPO")
const error = (message: string, status: number) => HttpResponse.json({ message }, { status })

/** Vista de un grupo para una persona (`esAdmin`, totales); null si no es miembro. */
export function vistaGrupo(c: Conversacion, personaId: number): Conversacion | null {
  const lista = miembrosGrupo.get(c.id) ?? []
  const yo = lista.find((m) => m.id === personaId)
  if (!yo) return null
  const ajenos = mensajes.filter((m) => m.conversacionId === c.id && m.autor.id !== personaId && !m.sistema)
  const leidos = leidosPor.get(`${c.id}:${personaId}`) ?? 0
  return {
    ...c,
    esAdmin: yo.admin,
    esCreador: c.creadoPor === nombreDe(personaId),
    totalMiembros: lista.length,
    miembrosDestacados: lista.filter((m) => m.id !== personaId).slice(0, 3).map((m) => m.nombre),
    noLeidos: ajenos.filter((m) => m.id > leidos).length,
    silenciadoHasta: yo.silenciado ? "9999-12-31T00:00:00.000Z" : null,
  }
}

/** Lista de conversaciones del que pide: los grupos solo si es miembro. */
export function filtrarGrupos(rows: Conversacion[], request: Request) {
  const yo = personaDe(request).id
  return rows.flatMap((c) => (c.tipo === "GRUPO" ? (vistaGrupo(c, yo) ?? []) : [c]))
}

const leidosPor = new Map<string, number>()

function nombreDe(id: number) {
  return id === USUARIO_ACTUAL.id ? USUARIO_ACTUAL.nombre : (personas.find((p) => p.id === id)?.nombre ?? "?")
}

function aMiembro(m: MiembroGrupo): Miembro {
  return { id: m.id, nombre: m.nombre, rol: m.admin ? "Administrador" : "Miembro", enLinea: false, bloqueado: false, esAdmin: m.admin }
}

/** Mensaje SISTEMA ("X se ha unido a…"), difundido en vivo como comms-service. */
function sistema(conversacionId: number, autor: { id: number; nombre: string }, texto: string) {
  const m = nuevoMensaje(conversacionId, texto, null, {}, { ...autor, enLinea: false })
  m.sistema = true
  publish(`canal:${conversacionId}`, "mensaje.creado", { ...m, esPropio: false })
}

/** La lista de participantes cambió: quien tenga el grupo abierto la vuelve a pedir. */
function miembrosActualizados(conversacionId: number) {
  publish(`canal:${conversacionId}`, "miembros.actualizados", { conversacionId })
}

/**
 * Aviso de membresía en la campana (CHAT_GRUPO_AGREGADO / QUITADO / SALIDA) para quien tenga
 * cuenta en el mock, también en vivo (`notification.created` en su tópico).
 */
function avisoMembresia(
  personaId: number,
  tipo: "CHAT_GRUPO_AGREGADO" | "CHAT_GRUPO_QUITADO" | "CHAT_GRUPO_SALIDA",
  titulo: string,
  cuerpo: string,
  deep_link: string,
  actor: string,
) {
  const usuario = correoDe(personaId)
  if (!usuario) return
  const fila = {
    id: `chat-${tipo}-${personaId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    categoria: "CHAT" as const,
    titulo,
    cuerpo_corto: cuerpo,
    deep_link,
    prioridad: "NORMAL" as const,
    creada_en: new Date().toISOString(),
    leida_en: null,
    actores: [actor],
    conteo: null,
    archivada: false,
    usuario,
  }
  notificacionesDb.unshift(fila)
  publish(`user:${usuario}`, "notification.created", fila)
}

/** La conversación aparece (o cambia) en vivo en la lista de esa persona. */
function publicarEnLista(c: Conversacion, personaId: number) {
  const usuario = correoDe(personaId)
  const vista = vistaGrupo(c, personaId)
  if (usuario && vista) publish(`user:${usuario}`, "conversacion.actualizada", vista)
}

/** Aviso CHAT_MENSAJE agrupado: una entrada viva por conversación y persona. */
function avisar(c: Conversacion, autor: { id: number; nombre: string }, m: Mensaje) {
  for (const x of miembrosGrupo.get(c.id) ?? []) {
    const usuario = correoDe(x.id)
    if (x.id === autor.id || x.silenciado || !usuario) continue
    const cuerpo = `${autor.nombre}: ${m.texto.slice(0, 140)}`
    const abierta = notificacionesDb.find(
      (n) => n.usuario === usuario && n.tipo === "CHAT_MENSAJE" && !n.leida_en && n.deep_link?.includes(`canal=${c.id}&`),
    )
    const deep_link = `/app/comunicaciones/chat?canal=${c.id}&mensaje=${m.id}`
    if (abierta) {
      Object.assign(abierta, {
        conteo: (abierta.conteo ?? 1) + 1,
        cuerpo_corto: cuerpo,
        deep_link,
        creada_en: m.fecha,
        actores: [...new Set([autor.nombre, ...(abierta.actores ?? [])])],
      })
      continue
    }
    notificacionesDb.unshift({
      id: `chat-grupo-${c.id}-${x.id}-${m.id}`,
      tipo: "CHAT_MENSAJE",
      categoria: "CHAT",
      titulo: `Nuevos mensajes en ${c.nombre}`,
      cuerpo_corto: cuerpo,
      deep_link,
      prioridad: "NORMAL",
      creada_en: m.fecha,
      leida_en: null,
      actores: [autor.nombre],
      conteo: 1,
      archivada: false,
      usuario,
    })
  }
}

export const comunicacionesGruposHandlers = [
  http.post(URL("conversaciones"), async ({ request }) => {
    const body = (await request.clone().json()) as { NOMBRE?: string; TIPO?: string; MIEMBROS?: number[] }
    if (body.TIPO !== "GRUPO") return undefined
    await delay(200)
    const nombre = body.NOMBRE?.trim()
    if (!nombre) return error("Escribe un nombre para el grupo.", 400)
    const yo = personaDe(request)
    const invitados = personas.filter((p) => body.MIEMBROS?.includes(p.id) && p.id !== yo.id)
    if (invitados.length === 0) return error("Agrega al menos un participante al grupo.", 400)
    const c: Conversacion = {
      id: Math.max(0, ...conversaciones.map((x) => x.id)) + 1,
      nombre,
      tipo: "GRUPO",
      categoria: "GENERAL",
      noLeidos: 0,
      actividadAbierta: false,
      esBot: false,
      totalMiembros: 0,
      miembrosDestacados: [],
      silenciadoHasta: null,
      archivada: false,
      creadoPor: yo.nombre,
      esCreador: true,
    }
    conversaciones.push(c)
    miembrosGrupo.set(c.id, [
      { id: yo.id, nombre: yo.nombre, admin: true, desde: ++reloj, silenciado: false },
      ...invitados.map((p) => ({ id: p.id, nombre: p.nombre, admin: false, desde: ++reloj, silenciado: false })),
    ])
    for (const p of invitados) {
      sistema(c.id, p, `se ha unido a ${nombre}.`)
      publicarEnLista(c, p.id)
      avisoMembresia(p.id, "CHAT_GRUPO_AGREGADO", `Te agregaron a ${nombre}`, `${yo.nombre} te agregó al grupo ${nombre}.`, `/app/comunicaciones/chat?canal=${c.id}`, yo.nombre)
    }
    return HttpResponse.json({ rows: [vistaGrupo(c, yo.id)] })
  }),

  http.get(URL("conversaciones/:id/miembros"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const lista = miembrosGrupo.get(c.id) ?? []
    if (!lista.some((m) => m.id === personaDe(request).id)) return error("La conversación no existe.", 404)
    return HttpResponse.json({ rows: lista.map(aMiembro) })
  }),

  http.post(URL("conversaciones/:id/miembros"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const lista = miembrosGrupo.get(c.id) ?? []
    const yo = personaDe(request)
    // Política del mock: `agregar` ADMIN (como el default de comms-service) o TODOS.
    const yoMiembro = lista.find((m) => m.id === yo.id)
    if (!yoMiembro || (!yoMiembro.admin && politicaChat.grupos?.agregar !== "TODOS")) {
      return error("Solo quien administra el grupo puede hacerlo.", 403)
    }
    const body = (await request.json()) as { MIEMBROS?: number[] }
    for (const p of personas.filter((x) => body.MIEMBROS?.includes(x.id) && !lista.some((m) => m.id === x.id))) {
      lista.push({ id: p.id, nombre: p.nombre, admin: false, desde: ++reloj, silenciado: false })
      sistema(c.id, p, `se ha unido a ${c.nombre}.`)
      publicarEnLista(c, p.id)
      avisoMembresia(p.id, "CHAT_GRUPO_AGREGADO", `Te agregaron a ${c.nombre}`, `${yo.nombre} te agregó al grupo ${c.nombre}.`, `/app/comunicaciones/chat?canal=${c.id}`, yo.nombre)
    }
    miembrosActualizados(c.id)
    return HttpResponse.json({ rows: lista.map(aMiembro) })
  }),

  http.patch(URL("conversaciones/:id/miembros/:miembro/rol"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const lista = miembrosGrupo.get(c.id) ?? []
    if (!lista.find((m) => m.id === personaDe(request).id)?.admin) {
      return error("Solo quien administra el grupo puede hacerlo.", 403)
    }
    const m = lista.find((x) => x.id === Number(params.miembro))
    if (!m) return error("La persona ya no está en el grupo.", 404)
    const admin = ((await request.json()) as { ROL?: string }).ROL === "ADMIN"
    if (!admin && m.admin && lista.filter((x) => x.admin).length <= 1) {
      return error("Debe quedar al menos un administrador.", 409)
    }
    m.admin = admin
    miembrosActualizados(c.id)
    return HttpResponse.json({ rows: [aMiembro(m)] })
  }),

  http.patch(URL("conversaciones/:id/miembros/:miembro/eliminar"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const lista = miembrosGrupo.get(c.id) ?? []
    const yo = personaDe(request)
    if (!lista.find((m) => m.id === yo.id)?.admin) return error("Solo quien administra el grupo puede hacerlo.", 403)
    if (Number(params.miembro) === yo.id) return error("Para irte usa Salir.", 400)
    const i = lista.findIndex((x) => x.id === Number(params.miembro))
    if (i < 0) return error("La persona ya no está en el grupo.", 404)
    const [m] = lista.splice(i, 1)
    sistema(c.id, m, `ya no está en ${c.nombre}.`)
    miembrosActualizados(c.id)
    // A quien quitaron: sale de su lista en vivo y le queda el aviso en la campana.
    const correo = correoDe(m.id)
    if (correo) publish(`user:${correo}`, "conversacion.eliminada", { id: c.id, motivo: "QUITADO" })
    avisoMembresia(m.id, "CHAT_GRUPO_QUITADO", `Te quitaron de ${c.nombre}`, `${yo.nombre} te quitó del grupo ${c.nombre}.`, "/app/comunicaciones/chat", yo.nombre)
    return HttpResponse.json({ rows: [aMiembro(m)] })
  }),

  http.patch(URL("conversaciones/:id/salir"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const lista = miembrosGrupo.get(c.id) ?? []
    const yo = personaDe(request)
    const i = lista.findIndex((m) => m.id === yo.id)
    if (i < 0) return error("La conversación no existe.", 404)
    const antes = vistaGrupo(c, yo.id)
    const [salio] = lista.splice(i, 1)
    sistema(c.id, salio, `salió de ${c.nombre}.`)
    // Sucesión: el último administrador se fue → el miembro más antiguo administra.
    if (salio.admin && lista.length > 0 && !lista.some((m) => m.admin)) {
      lista.reduce((a, b) => (a.desde <= b.desde ? a : b)).admin = true
    }
    miembrosActualizados(c.id)
    for (const a of lista.filter((m) => m.admin)) {
      avisoMembresia(a.id, "CHAT_GRUPO_SALIDA", `${salio.nombre} salió de ${c.nombre}`, `Ya no participa en el grupo ${c.nombre}.`, `/app/comunicaciones/chat?canal=${c.id}`, salio.nombre)
    }
    return HttpResponse.json({ rows: [antes] })
  }),

  http.patch(URL("conversaciones/:id/silenciar"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(100)
    const yo = (miembrosGrupo.get(c.id) ?? []).find((m) => m.id === personaDe(request).id)
    if (!yo) return error("La conversación no existe.", 404)
    yo.silenciado = true
    return HttpResponse.json({ rows: [vistaGrupo(c, yo.id)] })
  }),

  http.patch(URL("conversaciones/:id/leido"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    const yo = personaDe(request).id
    leidosPor.set(`${c.id}:${yo}`, Math.max(0, ...mensajes.filter((m) => m.conversacionId === c.id).map((m) => m.id)))
    return HttpResponse.json({ rows: [vistaGrupo(c, yo) ?? c] })
  }),

  http.get(URL("conversaciones/:id/mensajes"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(200)
    const yo = personaDe(request).id
    if (!vistaGrupo(c, yo)) return error("La conversación no existe.", 404)
    const rows = mensajes
      .filter((m) => m.conversacionId === c.id)
      .map((m) => ({ ...m, esPropio: m.autor.id === yo }))
    return HttpResponse.json({ rows })
  }),

  http.post(URL("conversaciones/:id/mensajes"), async ({ params, request }) => {
    const c = grupo(params.id)
    if (!c) return undefined
    await delay(150)
    const yo = personaDe(request)
    if (!vistaGrupo(c, yo.id)) return error("La conversación no existe.", 404)
    const texto = ((await request.json()) as { TEXTO?: string }).TEXTO?.trim() ?? ""
    if (!texto) return error("Escribe un mensaje o adjunta un archivo.", 400)
    const m = nuevoMensaje(c.id, texto, null, {}, { ...yo, enLinea: true })
    leidosPor.set(`${c.id}:${yo.id}`, m.id)
    avisar(c, yo, m)
    return HttpResponse.json({ rows: [{ ...m, esPropio: true }] })
  }),
]
