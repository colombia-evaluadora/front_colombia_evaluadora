import type { AutorMensaje, Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import type { EtiquetaForo, Publicacion } from "@/features/comunicaciones/foros/api/types"
import { citaDe } from "@/mocks/realtime/chat"
import { USUARIO_ACTUAL, autorDe, conversaciones, mensajes, nuevoMensaje } from "@/mocks/db/comunicaciones"

/**
 * Foros del mock (DB en memoria, recargar resetea). Misma forma que
 * comms-service (`foro/ForoDtos.java`): el cuerpo y las respuestas viven en el
 * arreglo `mensajes` del chat, así reacciones y ediciones usan los handlers
 * del chat igual que en el backend real.
 */

export interface HiloMock {
  id: number
  foroId: number
  raizId: number
  titulo: string
  autor: AutorMensaje
  fecha: string
  ultimaActividad: string
  fijada: boolean
  cerrada: boolean
  resuelta: boolean
  solucionId: number | null
  etiquetas: number[]
  seguidores: Set<number>
  eliminada: boolean
}

export const etiquetasPorForo = new Map<number, EtiquetaForo[]>()
export const hilos: HiloMock[] = []
/** id de mensaje (respuesta) → id del hilo. */
export const hiloDeRespuesta = new Map<number, number>()

let siguienteEtiqueta = 0
let siguienteHilo = 0

export function crearEtiqueta(foroId: number, nombre: string, color: EtiquetaForo["color"], soloModeradores = false) {
  siguienteEtiqueta += 1
  const e: EtiquetaForo = { id: siguienteEtiqueta, nombre, color, soloModeradores }
  etiquetasPorForo.set(foroId, [...(etiquetasPorForo.get(foroId) ?? []), e])
  return e
}

export function crearHilo(
  foroId: number,
  titulo: string,
  texto: string,
  autor: AutorMensaje,
  etiquetas: number[],
  extra: Pick<Mensaje, "adjunto" | "menciones"> = { adjunto: null },
  fecha = new Date(),
) {
  const raiz = nuevoMensaje(foroId, texto, extra.adjunto ?? null, { menciones: extra.menciones }, autor)
  raiz.fecha = fecha.toISOString()
  siguienteHilo += 1
  const h: HiloMock = {
    id: siguienteHilo,
    foroId,
    raizId: raiz.id,
    titulo,
    autor,
    fecha: raiz.fecha,
    ultimaActividad: raiz.fecha,
    fijada: false,
    cerrada: false,
    resuelta: false,
    solucionId: null,
    etiquetas,
    seguidores: new Set([autor.id]),
    eliminada: false,
  }
  hilos.push(h)
  return h
}

export function responderHilo(
  h: HiloMock,
  texto: string,
  autor: AutorMensaje,
  respuestaA: Mensaje | null = null,
  extra: Pick<Mensaje, "adjunto" | "menciones"> = { adjunto: null },
  fecha = new Date(),
) {
  const m = nuevoMensaje(
    h.foroId,
    texto,
    extra.adjunto ?? null,
    { respuestaA: respuestaA ? citaDe(respuestaA) : null, menciones: extra.menciones },
    autor,
  )
  m.fecha = fecha.toISOString()
  hiloDeRespuesta.set(m.id, h.id)
  h.ultimaActividad = m.fecha
  h.seguidores.add(autor.id)
  return m
}

export const respuestasDe = (h: HiloMock) =>
  mensajes.filter((m) => hiloDeRespuesta.get(m.id) === h.id).sort((a, b) => a.id - b.id)

export const raizDe = (h: HiloMock) => mensajes.find((m) => m.id === h.raizId) ?? null

export function hiloDeMensaje(mensajeId: number) {
  const id = hiloDeRespuesta.get(mensajeId)
  return hilos.find((h) => !h.eliminada && (h.id === id || h.raizId === mensajeId))
}

/** DTO como `ForoRepository.publicacion`; `visor` null = forma neutra del socket. */
export function aPublicacion(h: HiloMock, visor: number | null, conMensaje: boolean, totalCount = 1): Publicacion {
  const raiz = raizDe(h)
  const etiquetas = (etiquetasPorForo.get(h.foroId) ?? []).filter((e) => h.etiquetas.includes(e.id))
  const texto = raiz?.texto ?? ""
  return {
    id: h.id,
    foroId: h.foroId,
    titulo: h.titulo,
    autor: h.autor,
    esPropia: visor != null && h.autor.id === visor,
    fecha: h.fecha,
    ultimaActividad: h.ultimaActividad,
    respuestas: respuestasDe(h).length,
    reacciones: (raiz?.reacciones ?? []).reduce((n, r) => n + r.total, 0),
    fijada: h.fijada,
    cerrada: h.cerrada,
    resuelta: h.resuelta,
    solucionId: h.solucionId,
    etiquetas,
    siguiendo: visor != null && h.seguidores.has(visor),
    extracto: texto.length > 200 ? `${texto.slice(0, 200)}…` : texto,
    totalCount,
    mensaje: conMensaje ? raiz : null,
  }
}

/** Aproximación de `websearch_to_tsquery('spanish')`: sin tildes y por raíz (5 letras). */
export function coincideBusqueda(h: HiloMock, q: string) {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  const texto = norm(`${h.titulo} ${raizDe(h)?.texto ?? ""}`)
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => texto.includes(palabra.slice(0, Math.max(3, Math.min(5, palabra.length)))))
}

// ── Semilla ─────────────────────────────────────────────────────────────────

function foroSemilla(id: number, nombre: string, totalMiembros: number): Conversacion {
  const c: Conversacion = {
    id,
    nombre,
    tipo: "FORO",
    categoria: "GENERAL",
    noLeidos: 0,
    actividadAbierta: false,
    esBot: false,
    totalMiembros,
    miembrosDestacados: ["Darlene Robertson", "Marta Lucía Ríos"],
    silenciadoHasta: null,
    archivada: false,
    creadoPor: USUARIO_ACTUAL.nombre,
    esCreador: true,
    menciones: 0,
  }
  conversaciones.push(c)
  return c
}

const darlene = autorDe(2, "Darlene Robertson")
const marta = autorDe(3, "Marta Lucía Ríos", false)
const sofia = autorDe(10, "Sofía Henao Ruiz")
const horasAtras = (h: number) => new Date(Date.now() - h * 60 * 60_000)

const ciencias = foroSemilla(900, "dudas-ciencias-7a", 34)
const tarea = crearEtiqueta(ciencias.id, "Tarea", "GREEN")
const duda = crearEtiqueta(ciencias.id, "Duda", "BLUE")
const anuncio = crearEtiqueta(ciencias.id, "Anuncio", "RED", true)

const reglas = crearHilo(
  ciencias.id,
  "Normas del foro de ciencias",
  "Pregunten con un título claro y usen la etiqueta **Tarea** o **Duda**.\nMarquen la respuesta que les sirvió como *solución*.",
  USUARIO_ACTUAL,
  [anuncio.id],
  { adjunto: null },
  horasAtras(72),
)
reglas.fijada = true
reglas.cerrada = true

const fotosintesis = crearHilo(
  ciencias.id,
  "¿Qué entra y qué sale en la fotosíntesis?",
  "No entiendo qué hacen las plantas con la luz y el agua. ¿Alguien me explica con un ejemplo?",
  sofia,
  [duda.id],
  { adjunto: null },
  horasAtras(20),
)
const r1 = responderHilo(
  fotosintesis,
  "Entran agua, CO₂ y luz; salen glucosa y oxígeno. Mira la página 42 del libro.",
  darlene,
  null,
  { adjunto: null },
  horasAtras(18),
)
responderHilo(fotosintesis, "¡Gracias! ¿Y la clorofila dónde entra?", sofia, r1, { adjunto: null }, horasAtras(17))
responderHilo(
  fotosintesis,
  "La clorofila es el pigmento que capta la luz.",
  marta,
  null,
  { adjunto: null },
  horasAtras(16),
)
fotosintesis.resuelta = true
fotosintesis.solucionId = r1.id
const raizFoto = raizDe(fotosintesis)
if (raizFoto) raizFoto.reacciones = [{ emoji: "👍", total: 3, mia: false, personas: ["Darlene Robertson", "Marta Lucía Ríos", "Jorge Pineda"], usuarios: [2, 3, 6] }]

const laboratorio = crearHilo(
  ciencias.id,
  "Entrega del informe de laboratorio",
  "El informe del experimento de germinación se entrega el viernes en PDF.",
  USUARIO_ACTUAL,
  [tarea.id],
  { adjunto: { nombre: "plantilla-informe.pdf", formato: "PDF", eliminadoEn: null } },
  horasAtras(6),
)
responderHilo(laboratorio, "¿Se puede entregar en Word?", sofia, null, { adjunto: null }, horasAtras(5))

const docentes = foroSemilla(901, "foro-docentes", 18)
crearEtiqueta(docentes.id, "Planeación", "PURPLE")
crearHilo(
  docentes.id,
  "Ideas para la semana de la ciencia",
  "Propongan actividades por grado; las organizamos en la reunión del lunes.",
  marta,
  [],
  { adjunto: null },
  horasAtras(30),
)
