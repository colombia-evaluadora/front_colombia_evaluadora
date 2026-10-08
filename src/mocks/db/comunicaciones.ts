import type {
  Persona,
  AutorMensaje,
  Conversacion,
  Mensaje,
  ArchivoCompartido,
  Borrador,
  Miembro,
  TipoVotacionRapida,
} from "@/features/comunicaciones/chat/api/types"
import { ETIQUETAS_VOTACION_RAPIDA } from "@/features/comunicaciones/chat/lib/votacion-rapida"

// Datos del chat. Fechas relativas a hoy para que "Hoy"/"Ayer" siempre se vean.

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

// Votación rápida nueva del usuario actual, publicada como mensaje.
export function nuevaVotacionRapida(
  conversacionId: number,
  pregunta: string,
  tipo: TipoVotacionRapida,
  minutos: number,
  votos: [number, number] = [0, 0],
  creadaEn = new Date(),
) {
  const m = mensaje(conversacionId, USUARIO_ACTUAL, "", creadaEn.toISOString())
  m.votacion = {
    pregunta,
    tipo,
    minutos,
    cierraEn: new Date(creadaEn.getTime() + minutos * 60_000).toISOString(),
    opciones: ETIQUETAS_VOTACION_RAPIDA[tipo].map((etiqueta, i) => ({ id: i + 1, etiqueta, votos: votos[i] })),
    miVoto: null,
  }
  mensajes.push(m)
  return m
}

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
    editable: true,
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

export const personas: Persona[] = [
  { id: 2, nombre: "Darlene Robertson", correo: "darlene.robertson@iesimonbolivar.edu.co" },
  { id: 3, nombre: "Marta Lucía Ríos", correo: "marta.rios@iesimonbolivar.edu.co" },
  { id: 4, nombre: "Fernney Antonio Jaramillo Gomez", correo: "fernney.jaramillo@iesimonbolivar.edu.co" },
  { id: 5, nombre: "Munera Gomez Carlos Antonio", correo: "carlos.munera@iesimonbolivar.edu.co" },
  { id: 6, nombre: "Jorge Pineda", correo: "jorge.pineda@iesimonbolivar.edu.co" },
  { id: 7, nombre: "Natalia Restrepo Vélez", correo: "natalia.restrepo@iesimonbolivar.edu.co" },
  { id: 8, nombre: "Pedro Castaño Ruiz", correo: "pedro.castano@iesimonbolivar.edu.co" },
]

// "X se ha unido a <canal>."
export function avisoUnion(conversacionId: number, persona: Persona, canal: string) {
  const m = mensaje(
    conversacionId,
    { id: persona.id, nombre: persona.nombre, enLinea: false },
    `se ha unido a ${canal}.`,
    new Date().toISOString(),
  )
  m.sistema = true
  mensajes.push(m)
}

const LOREM =
  "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin lacinia nisi nec ex iaculis, quis laoreet tortor congue. Morbi sagittis eros vel enim convallis consequat. Morbi blandit sed enim eget venenatis. Suspendisse potenti.</p><p></p><p>Aliquam et accumsan justo. In ultrices eros lacinia, pellentesque erat non, egestas neque. Praesent odio tellus, iaculis ac sapien eget, semper consectetur turpis. Nam tincidunt iaculis magna et dictum.</p>"

// Contenido HTML de los documentos editables, por id de archivo.
export const contenidoDocumentos = new Map<number, string>(
  archivos
    .filter((a) => a.editable)
    .map((a) => [
      a.id,
      `<p style="text-align: center"><strong>${a.nombre.replace(/\.\w+$/, "").replace(/_/g, " ").toUpperCase()}</strong></p><p></p>${LOREM}`,
    ]),
)

const EXTRA_MIEMBROS = [
  "Lina Marcela Jaramillo Jaramillo",
  "Edwin Fernney Sierra Ramírez",
  "Fran Torres Gonzalez Gomez",
  "Camila Andrea Ospina",
  "Julián David Cardona",
  "Sara Valentina Mejía",
  "Mateo Esteban Arango",
  "Valeria Gómez Henao",
  "Santiago Restrepo Mora",
  "Laura Daniela Zapata",
  "Tomás Felipe Ochoa",
]

// Miembros por conversación, creados la primera vez que se piden.
const miembrosPorConversacion = new Map<number, Miembro[]>()

export function miembrosDe(conversacionId: number): Miembro[] {
  let lista = miembrosPorConversacion.get(conversacionId)
  if (!lista) {
    lista = [
      // Algunas personas del colegio quedan fuera para poder añadirlas.
      ...personas.slice(0, 3).map((p, i) => ({ id: p.id, nombre: p.nombre, rol: "Docente", enLinea: i % 3 !== 2, bloqueado: false })),
      ...EXTRA_MIEMBROS.map((nombre, i) => ({
        id: 100 + i,
        nombre,
        rol: i % 4 === 3 ? "Coordinador" : "Docente",
        enLinea: i % 2 === 0,
        bloqueado: i === 0,
      })),
    ]
    miembrosPorConversacion.set(conversacionId, lista)
  }
  return lista
}

// Una votación rápida ya cerrada para ver los resultados finales.
nuevaVotacionRapida(3, "¿Suspender clases mañana?", "SI_NO", 5, [18, 9], new Date(Date.now() - 60 * 60_000))
