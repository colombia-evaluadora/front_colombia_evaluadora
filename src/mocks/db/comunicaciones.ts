import type {
  AutorMensaje,
  ChatInstitucion,
  Conversacion,
  Mensaje,
  ArchivoCompartido,
  Borrador,
} from "@/features/comunicaciones/chat/api/types"

// Datos del chat. Fechas relativas a hoy para que "Hoy"/"Ayer" siempre se vean.

export const CHAT_INSTITUCION: ChatInstitucion = { id: 1, nombre: "IE Simón Bolívar" }

export const USUARIO_ACTUAL: AutorMensaje = { id: 1, nombre: "Andrés Gómez", enLinea: true }

const darlene: AutorMensaje = { id: 2, nombre: "Darlene Robertson", enLinea: true }
const marta: AutorMensaje = { id: 3, nombre: "Marta Lucía Ríos", enLinea: false }
const colevabot: AutorMensaje = { id: 99, nombre: "Colevabot", enLinea: true }

const MIEMBROS = ["Darlene Robertson", "Marta Lucía Ríos", "Jorge Pineda"]

export const conversaciones: Conversacion[] = [
  {
    id: 1,
    nombre: "Colevabot",
    tipo: "DIRECTO",
    categoria: "GENERAL",
    noLeidos: 0,
    actividadAbierta: false,
    esBot: true,
    totalMiembros: 2,
    miembrosDestacados: ["Colevabot"],
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 2,
    nombre: "01-matematicas-secundaria",
    tipo: "CANAL",
    categoria: "GENERAL",
    noLeidos: 1,
    actividadAbierta: false,
    esBot: false,
    totalMiembros: 48,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 3,
    nombre: "02-docentes-general",
    tipo: "CANAL",
    categoria: "GENERAL",
    noLeidos: 0,
    actividadAbierta: false,
    esBot: false,
    totalMiembros: 11629,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 4,
    nombre: "03-planeacion-clases",
    tipo: "CANAL",
    categoria: "GENERAL",
    noLeidos: 0,
    actividadAbierta: false,
    esBot: false,
    totalMiembros: 132,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 5,
    nombre: "Elección Personero 2026",
    tipo: "CANAL",
    categoria: "VOTACION",
    noLeidos: 0,
    actividadAbierta: true,
    esBot: false,
    totalMiembros: 860,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 6,
    nombre: "Encuesta Satisfacción",
    tipo: "CANAL",
    categoria: "ENCUESTA",
    noLeidos: 0,
    actividadAbierta: true,
    esBot: false,
    totalMiembros: 410,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 7,
    nombre: "Examen Matemáticas",
    tipo: "CANAL",
    categoria: "EXAMEN",
    noLeidos: 0,
    actividadAbierta: true,
    esBot: false,
    totalMiembros: 35,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
  {
    id: 8,
    nombre: "Suspensión de clases por mantenimiento",
    tipo: "CANAL",
    categoria: "ANUNCIO",
    noLeidos: 0,
    actividadAbierta: false,
    esBot: false,
    totalMiembros: 1240,
    miembrosDestacados: MIEMBROS,
    silenciadoHasta: null,
    archivada: false,
  },
]

function haceDias(dias: number, hora: number, minuto: number) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

let siguienteId = 100

function mensaje(
  conversacionId: number,
  autor: AutorMensaje,
  texto: string,
  fecha: string,
  adjunto: Mensaje["adjunto"] = null,
): Mensaje {
  siguienteId += 1
  return {
    id: siguienteId,
    conversacionId,
    autor,
    esPropio: autor.id === USUARIO_ACTUAL.id,
    texto,
    fecha,
    adjunto,
    editado: false,
    fijado: false,
  }
}

export const mensajes: Mensaje[] = [
  mensaje(3, marta, "Buenos días, ¿cómo van con el cierre del periodo?", haceDias(3, 9, 2)),
  mensaje(
    3,
    USUARIO_ACTUAL,
    "Todo bien, gracias. 😊 Andrés, ¿me podrías compartir la planeación de fracciones?",
    haceDias(3, 9, 15),
  ),
  mensaje(
    3,
    darlene,
    "Claro que sí, te la envío en un momento. ¿La necesitas en PDF o en Word?",
    haceDias(1, 10, 14),
  ),
  mensaje(3, USUARIO_ACTUAL, "En Word está perfecto, ¡muchas gracias!", haceDias(1, 10, 25)),
  mensaje(
    3,
    darlene,
    "Listo, ya te la adjunté. Avísame si necesitas algo más.",
    haceDias(0, 7, 30),
    { nombre: "planeación_fracciones.docx", formato: "WORD", eliminadoEn: null },
  ),
  mensaje(
    3,
    USUARIO_ACTUAL,
    "¡La recibí! Gracias de nuevo, me será de mucha ayuda. 👍",
    haceDias(0, 7, 31),
  ),
  mensaje(3, USUARIO_ACTUAL, "Les dejo la versión con los ajustes.", haceDias(0, 7, 40), {
    nombre: "planeación_fracciones_v2.docx",
    formato: "WORD",
    eliminadoEn: null,
  }),
  mensaje(
    1,
    colevabot,
    "Hola, soy Colevabot. Puedo ayudarte a encontrar planillas, informes y fechas del calendario académico.",
    haceDias(0, 6, 45),
  ),
  mensaje(
    2,
    marta,
    "Recuerden subir las notas del segundo periodo antes del viernes.",
    haceDias(0, 8, 5),
  ),
]

export function nuevoMensaje(
  conversacionId: number,
  texto: string,
  adjunto: Mensaje["adjunto"] = null,
) {
  const m = mensaje(conversacionId, USUARIO_ACTUAL, texto, new Date().toISOString(), adjunto)
  mensajes.push(m)
  return m
}

export const archivos: ArchivoCompartido[] = [
  {
    id: 1,
    nombre: "planeación_fracciones.docx",
    formato: "WORD",
    compartidoPor: "Darlene Robertson",
    esPropio: false,
    fecha: haceDias(0, 7, 30),
    conversacionId: 3,
    conversacionNombre: "02-docentes-general",
    enMiCanal: true,
  },
  {
    id: 2,
    nombre: "horario_segundo_periodo.pdf",
    formato: "PDF",
    compartidoPor: "Marta Lucía Ríos",
    esPropio: false,
    fecha: haceDias(4, 11, 10),
    conversacionId: 2,
    conversacionNombre: "01-matematicas-secundaria",
    enMiCanal: true,
  },
  {
    id: 3,
    nombre: "tablero_feria_ciencias.jpg",
    formato: "IMAGEN",
    compartidoPor: "Andrés Gómez",
    esPropio: true,
    fecha: haceDias(12, 15, 42),
    conversacionId: 4,
    conversacionNombre: "03-planeacion-clases",
    enMiCanal: true,
  },
  {
    id: 4,
    nombre: "circular_mantenimiento.pdf",
    formato: "PDF",
    compartidoPor: "Rectoría",
    esPropio: false,
    fecha: haceDias(40, 8, 0),
    conversacionId: 8,
    conversacionNombre: "Suspensión de clases por mantenimiento",
    enMiCanal: false,
  },
]

let siguienteBorrador = 0
const borrador = (
  conversacionId: number,
  texto: string,
  estado: Borrador["estado"],
  fecha: string,
): Borrador => ({
  id: ++siguienteBorrador,
  conversacionId,
  conversacionNombre: conversaciones.find((c) => c.id === conversacionId)?.nombre ?? "",
  texto,
  estado,
  fecha,
})

const enDias = (dias: number, hora: number) => haceDias(-dias, hora, 0)

export const borradores: Borrador[] = [
  borrador(2, "Les comparto la rúbrica de la evaluación final para que la revisen", "BORRADOR", haceDias(0, 9, 12)),
  borrador(4, "Propuesta de cronograma para la semana de proyectos", "BORRADOR", haceDias(2, 16, 40)),
  borrador(3, "Recuerden que mañana hay reunión de área a las 7:00 a. m.", "PROGRAMADO", enDias(1, 18)),
  borrador(2, "Ya están publicadas las notas del primer periodo.", "ENVIADO", haceDias(6, 10, 5)),
]
