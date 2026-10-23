import { http, HttpResponse, delay } from "msw"

import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import type { ResultadoMensaje } from "@/features/comunicaciones/chat/api/query/use-busqueda-chat-query"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"
import { normalizarBusqueda } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { conversaciones, mensajes, miembrosDe, personas, USUARIO_ACTUAL } from "@/mocks/db/comunicaciones"
import { filtrarGrupos } from "@/mocks/handlers/comunicaciones-grupos"

// Mock del historial y los filtros del chat (comms-service `POST /comunicaciones/buscar`).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`

// Grupos académicos de algunas personas del mock: estudiante y acudiente por matrícula,
// docentes por asignación. El usuario actual dicta en los dos.
const GRUPOS = [
  { valor: "601", etiqueta: "Sexto 601", detalle: "Sede principal" },
  { valor: "802", etiqueta: "Octavo 802", detalle: "Sede principal" },
]
const GRUPOS_DE: Record<number, number[]> = { 1: [601, 802], 2: [601], 3: [802], 9: [601], 10: [601] }

function perfilDe(id: number): PerfilChat {
  if (id === USUARIO_ACTUAL.id) return "DOCENTE"
  return personas.find((p) => p.id === id)?.perfil ?? "DOCENTE"
}

const TIPOS = new Set(["DIRECTO", "GRUPO", "CANAL"])
const ESTADOS = new Set(["LEIDO", "NO_LEIDO", "EDITADO", "ELIMINADO"])

interface BuscarBody {
  Q?: string
  PERSONA?: string
  PERFILES?: PerfilChat[]
  GRUPOS?: number[]
  TIPOS?: string[]
  DESDE?: string
  HASTA?: string
  ESTADOS?: string[]
  ANTES?: number
  LIMITE?: number
}

function nombreDe(id: number) {
  if (id === USUARIO_ACTUAL.id) return USUARIO_ACTUAL.nombre
  return personas.find((p) => p.id === id)?.nombre ?? mensajes.find((m) => m.autor.id === id)?.autor.nombre ?? ""
}

// Todas las palabras (sin tildes ni mayúsculas) presentes, como el servidor.
function coincideTexto(m: Mensaje, q: string) {
  const texto = normalizarBusqueda(`${m.texto} ${m.adjunto?.nombre ?? ""}`)
  return normalizarBusqueda(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => texto.includes(p))
}

function coincideAutor(id: number, b: BuscarBody) {
  if (b.PERSONA && !normalizarBusqueda(nombreDe(id)).includes(normalizarBusqueda(b.PERSONA))) return false
  if (b.PERFILES?.length && !b.PERFILES.includes(perfilDe(id))) return false
  if (b.GRUPOS?.length && !(GRUPOS_DE[id] ?? []).some((g) => b.GRUPOS!.includes(g))) return false
  return true
}

function miembrosIds(c: Conversacion) {
  if (c.tipo === "DIRECTO") return personas.filter((p) => p.nombre === c.nombre).map((p) => p.id)
  return miembrosDe(c.id).map((m) => m.id)
}

// Día de Colombia (UTC-5, sin horario de verano) del mensaje.
const diaDe = (fecha: string) => new Date(new Date(fecha).getTime() - 5 * 3600_000).toISOString().slice(0, 10)

// Los últimos `noLeidos` mensajes ajenos de la conversación cuentan como no leídos.
function noLeidos(porId: Map<number, Conversacion>) {
  const out = new Set<number>()
  for (const c of porId.values()) {
    mensajes
      .filter((m) => m.conversacionId === c.id && m.autor.id !== USUARIO_ACTUAL.id && !m.sistema && !m.eliminado)
      .sort((a, b) => b.id - a.id)
      .slice(0, c.noLeidos)
      .forEach((m) => out.add(m.id))
  }
  return out
}

export const comunicacionesFiltrosHandlers = [
  http.post(URL("buscar"), async ({ request }) => {
    await delay(250)
    const b = ((await request.json()) ?? {}) as BuscarBody
    if ((b.TIPOS ?? []).some((t) => !TIPOS.has(t)) || (b.ESTADOS ?? []).some((e) => !ESTADOS.has(e))) {
      return HttpResponse.json({ message: "Filtro no válido." }, { status: 400 })
    }
    const tipos = b.TIPOS?.length ? new Set(b.TIPOS) : TIPOS
    const mias = filtrarGrupos(conversaciones, request).filter((c) => tipos.has(c.tipo))
    const porId = new Map(mias.map((c) => [c.id, c]))
    const porAutor = Boolean(b.PERSONA || b.PERFILES?.length || b.GRUPOS?.length)
    const estados = b.ESTADOS ?? []
    const sinLeer = noLeidos(porId)
    const cumpleEstado = (m: Mensaje) =>
      estados.length === 0 ||
      (estados.includes("NO_LEIDO") && sinLeer.has(m.id)) ||
      (estados.includes("LEIDO") && !sinLeer.has(m.id)) ||
      (estados.includes("EDITADO") && m.editado) ||
      (estados.includes("ELIMINADO") && m.eliminado)
    const lim = Math.min(b.LIMITE ?? 30, 50)
    const todos = mensajes
      .filter(
        (m) =>
          porId.has(m.conversacionId) &&
          !m.sistema &&
          (!m.eliminado || estados.includes("ELIMINADO")) &&
          (!porAutor || coincideAutor(m.autor.id, b)) &&
          (!b.Q || (!m.eliminado && coincideTexto(m, b.Q))) &&
          (!b.DESDE || diaDe(m.fecha) >= b.DESDE) &&
          (!b.HASTA || diaDe(m.fecha) <= b.HASTA) &&
          cumpleEstado(m),
      )
      .sort((x, y) => y.id - x.id)
    const pagina = todos.filter((m) => b.ANTES == null || m.id < b.ANTES)
    const rows: ResultadoMensaje[] = pagina.slice(0, lim).map((m) => {
      const c = porId.get(m.conversacionId)!
      return {
        id: m.id,
        conversacionId: c.id,
        conversacion: c.nombre,
        tipoConversacion: c.tipo,
        categoria: c.categoria,
        autorId: m.autor.id,
        autor: m.autor.nombre,
        perfilAutor: perfilDe(m.autor.id),
        esPropio: m.autor.id === USUARIO_ACTUAL.id,
        texto: m.eliminado ? "" : m.texto,
        fecha: m.fecha,
        adjunto: !m.eliminado && m.adjunto && !m.adjunto.eliminadoEn ? m.adjunto.nombre : null,
        editado: m.editado,
        eliminado: Boolean(m.eliminado),
        noLeido: sinLeer.has(m.id),
      }
    })
    let ids: number[] = []
    if (b.ANTES == null) {
      const porPersonas = porAutor
        ? mias.filter((c) => miembrosIds(c).some((id) => id !== USUARIO_ACTUAL.id && coincideAutor(id, b)))
        : mias
      const porMensaje = Boolean(b.Q || b.DESDE || b.HASTA || estados.length)
      if (!porMensaje) {
        ids = porPersonas.map((c) => c.id)
      } else {
        const conHits = new Set(todos.map((m) => m.conversacionId))
        if (b.Q && !b.DESDE && !b.HASTA && estados.length === 0) {
          const q = normalizarBusqueda(b.Q)
          for (const c of porPersonas) if (normalizarBusqueda(c.nombre).includes(q)) conHits.add(c.id)
        }
        ids = [...conHits]
      }
    }
    return HttpResponse.json({ rows: [{ conversaciones: ids, mensajes: rows, hayMas: pagina.length > lim }] })
  }),

  http.get(URL("buscar/opciones"), async () => {
    await delay(150)
    return HttpResponse.json({
      rows: [
        {
          grupos: GRUPOS.map((g) => ({ ...g, total: 3 })),
          perfiles: ["DIRECTIVO", "DOCENTE", "ACUDIENTE", "ESTUDIANTE"],
        },
      ],
    })
  }),
]
